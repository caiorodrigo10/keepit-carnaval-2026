import { createServiceClient } from "@/lib/supabase/service";
import { generateImage } from "./kie-client";
import { saveGeneratedImage } from "./storage";
import { applyWatermark } from "./watermark";
import { AI_PHOTO_LIMITS } from "@/types/ai-photo";

/**
 * Check how many generations a lead has (excluding failed ones).
 * Uses service client to bypass RLS (runs in API route context).
 */
export async function getLeadGenerationCount(leadId: string): Promise<number> {
  const supabase = createServiceClient();

  const { count } = await supabase
    .from("ai_photo_generations")
    .select("*", { count: "exact", head: true })
    .eq("lead_id", leadId)
    .neq("status", "failed");

  return count ?? 0;
}

/**
 * Check if lead has reached generation limit.
 */
export async function hasReachedLimit(leadId: string): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return false;
  const count = await getLeadGenerationCount(leadId);
  return count >= AI_PHOTO_LIMITS.MAX_GENERATIONS_PER_LEAD;
}

/**
 * Verify lead exists.
 * Uses service client to bypass RLS (runs in API route context).
 */
export async function leadExists(leadId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .single();

  return !!data;
}

/**
 * V2: Generate a carnival clothing swap from a single user photo.
 * No templates — just transform the person's clothes into carnival outfit.
 *
 * Returns the generation ID.
 */
export async function createGeneration(
  leadId: string,
  photoUrl: string
): Promise<string> {
  const supabase = createServiceClient();

  // 1. Insert generation record
  const { data: generation, error: insertError } = await supabase
    .from("ai_photo_generations")
    .insert({
      lead_id: leadId,
      template_id: null,
      status: "processing",
      reference_photos: [photoUrl],
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    throw new Error(`Erro ao criar geracao: ${insertError?.message}`);
  }

  const generationId = generation.id;
  const startTime = Date.now();

  // V2 prompt: clothing swap only, preserve everything else
  const prompt = [
    "Transform the clothes and outfit of the person in this photo into a vibrant, elaborate Brazilian carnival costume.",
    "KEEP EXACTLY THE SAME: the person's face, facial features, skin tone, hair, body pose, body proportions, and the background/environment.",
    "ONLY CHANGE: the clothing and accessories. Replace them with a colorful carnival outfit featuring sequins, feathers, glitter, beads, and traditional Brazilian carnival elements.",
    "The costume should look festive, glamorous, and appropriate for Rio de Janeiro or São Paulo carnival.",
    "The result must be photorealistic — the person should look natural wearing the costume, with proper lighting and shadows matching the original photo.",
    "High quality, 8K resolution.",
  ].join(" ");

  console.log("[generate-v2] Starting generation:", generationId);
  console.log("[generate-v2] Photo URL:", photoUrl);
  console.log("[generate-v2] Prompt:", prompt);

  // 2. Generate via Kie.ai (nano-banana-pro) — single image, no template
  try {
    console.log("[generate-v2] Calling Kie.ai nano-banana-pro...");
    const imageBuffer = await generateImage({
      imageUrls: [photoUrl],
      prompt,
      resolution: "2K",
    });

    console.log(`[generate-v2] Image received, size: ${imageBuffer.length} bytes. Saving original...`);

    // Save original first (safe fallback)
    let storedUrl = await saveGeneratedImage(imageBuffer, generationId, 1);
    console.log(`[generate-v2] Original saved to ${storedUrl}`);

    // Apply watermark on a COPY of the buffer
    try {
      const watermarkedBuffer = await applyWatermark(Buffer.from(imageBuffer));
      console.log(`[generate-v2] Watermark applied, size: ${watermarkedBuffer.length} bytes. Replacing...`);
      storedUrl = await saveGeneratedImage(watermarkedBuffer, generationId, 1);
      console.log(`[generate-v2] Watermarked version saved to ${storedUrl}`);
    } catch (wmError) {
      console.warn("[generate-v2] Watermark failed, keeping original:", wmError);
    }

    const processingTime = Date.now() - startTime;
    console.log(`[generate-v2] Done. time=${processingTime}ms`);

    await supabase
      .from("ai_photo_generations")
      .update({
        variant_1_status: "completed",
        variant_1_url: storedUrl,
        status: "completed",
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
      })
      .eq("id", generationId);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[generate-v2] FAILED:", msg);

    const processingTime = Date.now() - startTime;
    await supabase
      .from("ai_photo_generations")
      .update({
        variant_1_status: "failed",
        status: "failed",
        completed_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        error_message: msg,
      })
      .eq("id", generationId);
  }

  return generationId;
}
