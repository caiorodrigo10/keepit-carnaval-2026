/**
 * Test script for Kie.ai nano-banana-pro face swap.
 * Run: npx tsx scripts/test-kie.ts
 *
 * Tests different prompts to find the best one for combining
 * a reference photo (face) with a template (body/scene).
 */

import * as fs from "fs";
import * as path from "path";

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";
const KIE_MODEL = "nano-banana-pro";
const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_TIME_MS = 120_000;

// Test images (already in Supabase Storage)
const REFERENCE_PHOTO =
  "https://kkwiytwlbikdbctuurtr.supabase.co/storage/v1/object/public/ai-photos/references/5e67e982-a7e5-4ca2-80ee-242f6e1870b6/1770431500323-0.jpg";
const TEMPLATE_IMAGE =
  "https://kkwiytwlbikdbctuurtr.supabase.co/storage/v1/object/public/ai-photos/templates/keepittemplate3.jpg";

// Prompts to test
const PROMPTS = [
  {
    name: "Teste 1: Face swap basico",
    prompt:
      "Replace the face of the person in the last image with the face from the first image. Keep the exact same pose, clothing, background, and lighting from the last image. Make it look like a natural, real photograph.",
  },
  {
    name: "Teste 2: Direto",
    prompt:
      "Take the face from image 1 and place it on the person in image 2. Maintain all details from image 2 except the face.",
  },
  {
    name: "Teste 3: Criativo",
    prompt:
      "Generate a photo of the person from image 1 wearing the same outfit and in the same pose as the person in image 2. Same background and lighting as image 2.",
  },
];

function getApiKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    throw new Error("KIE_API_KEY not found in .env.local");
  }
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest(
  testIndex: number,
  promptInfo: { name: string; prompt: string }
): Promise<{ success: boolean; timeMs: number; error?: string; resultUrl?: string }> {
  const apiKey = getApiKey();
  const startTime = Date.now();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`${promptInfo.name}`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Prompt: ${promptInfo.prompt}`);
  console.log(`Reference: ${REFERENCE_PHOTO.slice(0, 80)}...`);
  console.log(`Template: ${TEMPLATE_IMAGE.slice(0, 80)}...`);

  // 1. Create task
  console.log("\n[1] Creating task...");
  const createRes = await fetch(`${KIE_API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: KIE_MODEL,
      input: {
        prompt: promptInfo.prompt,
        image_input: [REFERENCE_PHOTO, TEMPLATE_IMAGE],
      },
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error(`[FAIL] HTTP ${createRes.status}: ${text}`);
    return { success: false, timeMs: Date.now() - startTime, error: `HTTP ${createRes.status}: ${text}` };
  }

  const createData = await createRes.json();
  console.log("[1] Response:", JSON.stringify(createData));

  if (createData.code !== 200 || !createData.data?.taskId) {
    const error = createData.msg || "No taskId returned";
    console.error(`[FAIL] ${error}`);
    return { success: false, timeMs: Date.now() - startTime, error };
  }

  const taskId = createData.data.taskId;
  console.log(`[1] Task created: ${taskId}`);

  // 2. Poll for completion
  console.log("\n[2] Polling for result...");
  const pollStart = Date.now();

  while (Date.now() - pollStart < MAX_POLL_TIME_MS) {
    await sleep(POLL_INTERVAL_MS);

    const statusRes = await fetch(
      `${KIE_API_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!statusRes.ok) {
      console.warn(`[2] Poll HTTP error: ${statusRes.status}`);
      continue;
    }

    const statusData = await statusRes.json();
    const state = statusData.data?.state;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`[2] State: ${state} (${elapsed}s)`);

    if (state === "success") {
      const resultJson = statusData.data?.resultJson;
      if (!resultJson) {
        return { success: false, timeMs: Date.now() - startTime, error: "Success but no resultJson" };
      }

      // Parse result URL
      let imageUrl: string;
      try {
        const parsed = JSON.parse(resultJson);
        if (typeof parsed === "string") {
          imageUrl = parsed;
        } else if (parsed.resultUrls && Array.isArray(parsed.resultUrls)) {
          imageUrl = parsed.resultUrls[0];
        } else if (Array.isArray(parsed)) {
          imageUrl = parsed[0]?.url || parsed[0]?.image_url || parsed[0];
        } else {
          imageUrl = parsed.url || parsed.image_url || parsed.output || parsed.image;
        }
      } catch {
        imageUrl = resultJson;
      }

      if (!imageUrl || typeof imageUrl !== "string") {
        return { success: false, timeMs: Date.now() - startTime, error: `Cannot extract URL from: ${resultJson}` };
      }

      console.log(`[2] Result URL: ${imageUrl.slice(0, 100)}...`);

      // 3. Download and save
      console.log("\n[3] Downloading result...");
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return { success: false, timeMs: Date.now() - startTime, error: `Download failed: ${imgRes.status}` };
      }

      const arrayBuffer = await imgRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to _test-photos/
      const outputDir = path.resolve(__dirname, "../_test-photos");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, `test-result-${testIndex + 1}.png`);
      fs.writeFileSync(outputPath, buffer);

      const totalTime = Date.now() - startTime;
      console.log(`[3] Saved to: ${outputPath}`);
      console.log(`[3] Size: ${buffer.length} bytes`);
      console.log(`[3] Total time: ${(totalTime / 1000).toFixed(1)}s`);
      console.log(`\n>>> SUCESSO! Abra ${outputPath} para verificar visualmente.`);

      return { success: true, timeMs: totalTime, resultUrl: imageUrl };
    }

    if (state === "fail") {
      const failMsg = statusData.data?.failMsg || statusData.data?.failCode || "Unknown";
      console.error(`[FAIL] ${failMsg}`);
      return { success: false, timeMs: Date.now() - startTime, error: failMsg };
    }
  }

  return { success: false, timeMs: Date.now() - startTime, error: "Timeout (120s)" };
}

async function main() {
  console.log("============================================================");
  console.log("  Kie.ai nano-banana-pro Face Swap Test");
  console.log("============================================================");
  console.log(`Model: ${KIE_MODEL}`);
  console.log(`API Key: ${getApiKey().slice(0, 8)}...`);
  console.log(`Tests: ${PROMPTS.length}`);

  const results: Array<{ name: string; success: boolean; timeMs: number; error?: string }> = [];

  for (let i = 0; i < PROMPTS.length; i++) {
    const result = await runTest(i, PROMPTS[i]);
    results.push({ name: PROMPTS[i].name, ...result });

    // If this test succeeded, still run the others for comparison
    if (i < PROMPTS.length - 1) {
      console.log("\n--- Waiting 3s before next test ---");
      await sleep(3000);
    }
  }

  // Summary
  console.log("\n\n============================================================");
  console.log("  RESUMO DOS TESTES");
  console.log("============================================================");
  for (const r of results) {
    const status = r.success ? "SUCESSO" : "FALHA";
    const time = (r.timeMs / 1000).toFixed(1);
    console.log(`${status} | ${time}s | ${r.name}${r.error ? ` | Erro: ${r.error}` : ""}`);
  }

  const anySuccess = results.some((r) => r.success);
  console.log(
    anySuccess
      ? "\n>>> Pelo menos um teste funcionou! Verifique as imagens em _test-photos/"
      : "\n>>> Todos os testes falharam. Revisar abordagem."
  );
}

main().catch(console.error);
