/**
 * Kie.ai client for AI photo generation.
 * Server-side only - never import this in client components.
 *
 * Uses Kie.ai's Nano Banana Pro API (powered by Gemini Pro Image).
 * Async flow: createTask → poll recordInfo → get result URL.
 */

const KIE_API_BASE = "https://api.kie.ai/api/v1/jobs";
const KIE_MODEL = "nano-banana-pro";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_TIME_MS = 120_000;

function getApiKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    throw new Error("KIE_API_KEY is not set.");
  }
  return key;
}

/**
 * Resolve a template image path to a full public URL.
 * Local paths like "/modeloskeepit/file.jpg" get prefixed with the app URL.
 * Full URLs are returned as-is.
 */
function resolvePublicUrl(urlOrPath: string): string {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    return urlOrPath;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}${urlOrPath}`;
}

interface KieCreateTaskResponse {
  code: number;
  msg: string;
  data?: { taskId: string };
}

interface KieTaskDetailResponse {
  code: number;
  msg?: string;
  message?: string;
  data?: {
    taskId: string;
    state: "waiting" | "queuing" | "generating" | "success" | "fail";
    resultJson?: string;
    failCode?: string;
    failMsg?: string;
  };
}

/**
 * Generate a single image using Kie.ai (Nano Banana Pro).
 *
 * V2: accepts a flat list of image URLs + prompt. No template concept.
 * For clothing swap: single user photo + prompt to transform outfit.
 *
 * Flow:
 * 1. POST createTask with prompt + image_input
 * 2. Poll recordInfo until state is "success" or "fail"
 * 3. Download the result image and return as Buffer
 */
export async function generateImage(input: {
  imageUrls: string[];
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
}): Promise<Buffer> {
  const apiKey = getApiKey();

  const imageInput = input.imageUrls.map(resolvePublicUrl);

  console.log("[kie] Creating task with", imageInput.length, "images (model:", KIE_MODEL, ")");

  // 1. Create task
  const createRes = await fetch(`${KIE_API_BASE}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: KIE_MODEL,
      input: {
        prompt: input.prompt,
        image_input: imageInput,
        ...(input.aspectRatio && { aspect_ratio: input.aspectRatio }),
        ...(input.resolution && { resolution: input.resolution }),
      },
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error("[kie] createTask HTTP error:", createRes.status, text);
    throw new Error(`Kie.ai API error (${createRes.status}): ${text}`);
  }

  const createData: KieCreateTaskResponse = await createRes.json();

  if (createData.code !== 200 || !createData.data?.taskId) {
    console.error("[kie] createTask failed:", JSON.stringify(createData));
    throw new Error(`Kie.ai createTask failed: ${createData.msg || "Unknown error"}`);
  }

  const taskId = createData.data.taskId;
  console.log("[kie] Task created:", taskId);

  // 2. Poll for completion
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    await sleep(POLL_INTERVAL_MS);

    const statusRes = await fetch(
      `${KIE_API_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!statusRes.ok) {
      console.warn("[kie] recordInfo HTTP error:", statusRes.status);
      continue;
    }

    const statusData: KieTaskDetailResponse = await statusRes.json();
    const state = statusData.data?.state;

    console.log("[kie] Task", taskId, "state:", state);

    if (state === "success") {
      const resultJson = statusData.data?.resultJson;
      if (!resultJson) {
        throw new Error("Kie.ai returned success but no resultJson");
      }

      // Parse result — Kie.ai returns {"resultUrls":["url1",...]} or other formats
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
        // If resultJson is already a plain URL string (not JSON)
        imageUrl = resultJson;
      }

      if (!imageUrl || typeof imageUrl !== "string") {
        console.error("[kie] Cannot extract image URL from resultJson:", resultJson);
        throw new Error("Kie.ai: could not extract image URL from result");
      }

      console.log("[kie] Image URL:", imageUrl.slice(0, 100));

      // 3. Download image as Buffer
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        throw new Error(`Failed to download generated image: ${imgRes.status}`);
      }
      const arrayBuffer = await imgRes.arrayBuffer();
      console.log("[kie] Image downloaded, size:", arrayBuffer.byteLength, "bytes");
      return Buffer.from(arrayBuffer);
    }

    if (state === "fail") {
      const failMsg = statusData.data?.failMsg || statusData.data?.failCode || "Unknown error";
      console.error("[kie] Task failed:", failMsg);
      throw new Error(`Kie.ai generation failed: ${failMsg}`);
    }

    // Still processing (waiting/queuing/generating), continue polling
  }

  throw new Error("Kie.ai generation timed out after 120 seconds");
}

/**
 * Analyze reference photos using Gemini 2.5 Flash (vision) via Kie.ai.
 * Extracts a physical description of the person: gender, skin tone, age, body type.
 * Used to build personalized prompts for nano-banana-pro generation.
 */
export async function analyzeReferencePhotos(
  referencePhotoUrls: string[]
): Promise<string> {
  const apiKey = getApiKey();

  const imageMessages = referencePhotoUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  const body = {
    model: "gemini-2.5-flash",
    messages: [
      {
        role: "user",
        content: [
          ...imageMessages,
          {
            type: "text" as const,
            text: [
              "Analyze the person in these photos and provide a concise physical description.",
              "Return ONLY a single paragraph with these attributes:",
              "- Gender (male/female)",
              "- Approximate age range (young adult, middle-aged, elderly)",
              "- Skin tone (very light, light, medium, olive, brown, dark brown, very dark)",
              "- Body build (slim, average, athletic, stocky, heavy)",
              "- Hair (color, length, style)",
              "- Any distinctive features",
              "",
              "Format: '[gender], [age range], [skin tone] skin, [build] build, [hair description]. [distinctive features if any].'",
              "Example: 'Female, young adult, dark brown skin, slim build, long black curly hair. Has a small nose piercing.'",
              "Example: 'Male, middle-aged, light skin, stocky build, short brown hair with beard.'",
              "",
              "Be precise about skin tone — this is critical for accurate image generation.",
              "Respond ONLY with the description, no preamble or explanation.",
            ].join("\n"),
          },
        ],
      },
    ],
    max_tokens: 200,
  };

  console.log("[kie-vision] Analyzing", referencePhotoUrls.length, "reference photos with Gemini 2.5 Flash...");

  const res = await fetch("https://api.kie.ai/gemini-2.5-flash/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[kie-vision] HTTP error:", res.status, text);
    throw new Error(`Gemini 2.5 Flash API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const description = data.choices?.[0]?.message?.content?.trim();

  if (!description) {
    console.error("[kie-vision] No description returned:", JSON.stringify(data));
    throw new Error("Gemini 2.5 Flash returned no description");
  }

  console.log("[kie-vision] Person description:", description);
  return description;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
