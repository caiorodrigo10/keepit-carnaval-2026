/**
 * Test: Full body transformation prompt (not just face swap)
 * Goal: Match skin tone, body type, and all visible skin areas to reference person
 */

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";
const KIE_MODEL = "nano-banana-pro";
const API_KEY = process.env.KIE_API_KEY;

if (!API_KEY) {
  console.error("Set KIE_API_KEY env var");
  process.exit(1);
}

// Same test images from EXPERIMENTO-KIE.md
const REFERENCE_PHOTO =
  "https://kkwiytwlbikdbctuurtr.supabase.co/storage/v1/object/public/ai-photos/references/5e67e982-a7e5-4ca2-80ee-242f6e1870b6/1770431500323-0.jpg";
const TEMPLATE_PHOTO =
  "https://kkwiytwlbikdbctuurtr.supabase.co/storage/v1/object/public/ai-photos/templates/keepittemplate3.jpg";

const PROMPTS = [
  {
    name: "Full body transform",
    prompt:
      "Transform the person in image 2 to look like the person from image 1. Match the skin tone, body type, and all visible skin areas (face, neck, arms, hands, legs) to the person in image 1. Keep the exact same pose, clothing, background, and lighting from image 2.",
  },
  {
    name: "Full identity transfer",
    prompt:
      "Replace the entire person in image 2 with the person from image 1. The person from image 1 should appear wearing the same outfit and in the same pose as image 2. All skin (face, neck, chest, arms, hands) must match the person from image 1. Keep background and lighting from image 2.",
  },
];

async function createTask(prompt: string): Promise<string> {
  const res = await fetch(`${KIE_API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: KIE_MODEL,
      input: {
        prompt,
        image_input: [REFERENCE_PHOTO, TEMPLATE_PHOTO],
      },
    }),
  });

  const data = await res.json();
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`createTask failed: ${JSON.stringify(data)}`);
  }
  return data.data.taskId;
}

async function pollResult(taskId: string): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < 120_000) {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await fetch(
      `${KIE_API_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${API_KEY}` } }
    );
    const data = await res.json();
    const state = data.data?.state;

    process.stdout.write(`  [${((Date.now() - start) / 1000).toFixed(1)}s] ${state}\n`);

    if (state === "success") {
      const resultJson = data.data.resultJson;
      const parsed = JSON.parse(resultJson);
      if (parsed.resultUrls) return parsed.resultUrls[0];
      if (Array.isArray(parsed)) return parsed[0];
      return typeof parsed === "string" ? parsed : parsed.url || parsed.image_url;
    }

    if (state === "fail") {
      throw new Error(`Task failed: ${data.data?.failMsg || "unknown"}`);
    }
  }
  throw new Error("Timeout");
}

async function downloadImage(url: string, filename: string) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const fs = await import("fs");
  fs.writeFileSync(filename, buffer);
  console.log(`  Saved: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
}

async function main() {
  console.log("=== Testing Full Body Prompts ===\n");
  console.log("Reference:", REFERENCE_PHOTO.slice(-40));
  console.log("Template:", TEMPLATE_PHOTO.slice(-40));
  console.log("");

  for (let i = 0; i < PROMPTS.length; i++) {
    const { name, prompt } = PROMPTS[i];
    console.log(`--- Test ${i + 1}: ${name} ---`);
    console.log(`Prompt: "${prompt.slice(0, 80)}..."`);

    try {
      const start = Date.now();
      const taskId = await createTask(prompt);
      console.log(`  Task: ${taskId}`);

      const imageUrl = await pollResult(taskId);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  Done in ${elapsed}s`);

      await downloadImage(
        imageUrl,
        `_test-photos/full-body-test-${i + 1}.png`
      );
    } catch (err) {
      console.error(`  FAILED:`, err);
    }
    console.log("");
  }
}

main();
