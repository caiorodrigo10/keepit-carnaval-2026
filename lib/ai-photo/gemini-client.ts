import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import { join, extname } from "path";

/**
 * Google Gemini client for AI photo generation.
 * Server-side only - never import this in client components.
 *
 * Uses Gemini 2.5 Flash Image for fast, synchronous image generation.
 * No webhooks needed - response includes the image directly.
 */

const MODEL_ID = "gemini-2.5-flash-image";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Load an image and return as base64.
 * Handles both local paths (starting with /) and full URLs.
 */
async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  // Local file in public/ folder
  if (url.startsWith("/") && !url.startsWith("//")) {
    const filePath = join(process.cwd(), "public", url);
    const buffer = await readFile(filePath);
    const data = buffer.toString("base64");
    const ext = extname(filePath).toLowerCase();
    const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
      : ext === ".webp" ? "image/webp"
      : "image/png";
    return { data, mimeType };
  }

  // Remote URL
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const data = Buffer.from(buffer).toString("base64");
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return { data, mimeType: contentType };
}

/**
 * Generate a single image using Gemini.
 * Returns the image as a Buffer (PNG).
 *
 * This is synchronous - the image is returned directly in the response,
 * no polling or webhooks needed.
 */
export async function generateImage(input: {
  referencePhotoUrls: string[];
  templateImageUrl: string;
  prompt: string;
  aspectRatio?: string;
}): Promise<Buffer> {
  const ai = getClient();

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  parts.push({ text: input.prompt });

  console.log("[gemini] Loading template image:", input.templateImageUrl);
  const templateImage = await imageUrlToBase64(input.templateImageUrl);
  console.log("[gemini] Template loaded, base64 length:", templateImage.data.length, "mime:", templateImage.mimeType);
  parts.push({ inlineData: templateImage });

  console.log("[gemini] Loading", input.referencePhotoUrls.length, "reference photos");
  for (const url of input.referencePhotoUrls) {
    const refImage = await imageUrlToBase64(url);
    console.log("[gemini] Ref photo loaded, base64 length:", refImage.data.length);
    parts.push({ inlineData: refImage });
  }

  console.log("[gemini] Calling Gemini API with", parts.length, "parts");

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    console.log("[gemini] Response received. Candidates:", response.candidates?.length ?? 0, "finishReason:", finishReason);

    if (!candidate?.content?.parts) {
      console.error("[gemini] No content parts. Full response:", JSON.stringify(response, null, 2).slice(0, 3000));
      throw new Error(`Gemini returned no content. finishReason: ${finishReason || "unknown"}`);
    }

    for (const part of candidate.content.parts) {
      if (part.text) {
        console.log("[gemini] Text response:", part.text.slice(0, 500));
      }
      if (part.inlineData?.data) {
        console.log("[gemini] Image generated, base64 length:", part.inlineData.data.length);
        return Buffer.from(part.inlineData.data, "base64");
      }
    }

    console.error("[gemini] No image in response parts. Parts count:", candidate.content.parts.length);
    throw new Error("Gemini responded but did not include an image");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[gemini] API error:", msg);
    throw error;
  }
}
