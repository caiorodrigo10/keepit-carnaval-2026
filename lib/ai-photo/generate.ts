import { createServiceClient } from "@/lib/supabase/service";
import { generateImage } from "./kie-client";
import { saveGeneratedImage } from "./storage";
import { AI_PHOTO_LIMITS } from "@/types/ai-photo";
import type { AiPhotoTemplate, AiPhotoGeneration } from "@/types/ai-photo";

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
  const count = await getLeadGenerationCount(leadId);
  return count >= AI_PHOTO_LIMITS.MAX_GENERATIONS_PER_LEAD;
}

/**
 * Fetch template by ID.
 * Uses service client to bypass RLS (runs in API route context).
 */
export async function getTemplate(templateId: string): Promise<AiPhotoTemplate | null> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("ai_photo_templates")
    .select("*")
    .eq("id", templateId)
    .eq("is_active", true)
    .single();

  return data as AiPhotoTemplate | null;
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
 * Create a generation record, generate 1 variant via Kie.ai (nano-banana-pro), and save result.
 * User can regenerate if they want a different result.
 *
 * Returns the generation ID.
 */
export async function createGeneration(
  leadId: string,
  template: AiPhotoTemplate,
  referencePhotos: string[]
): Promise<string> {
  const supabase = createServiceClient();

  // 1. Insert generation record
  const { data: generation, error: insertError } = await supabase
    .from("ai_photo_generations")
    .insert({
      lead_id: leadId,
      template_id: template.id,
      status: "processing",
      reference_photos: referencePhotos,
    })
    .select("id")
    .single();

  if (insertError || !generation) {
    throw new Error(`Erro ao criar geracao: ${insertError?.message}`);
  }

  const generationId = generation.id;
  const startTime = Date.now();

  // Build full identity transfer prompt: reference photo (person) + template (body/scene)
  // Send only the first reference photo as identity source
  const prompt = `Replace the entire person in image 2 with the person from image 1. The person from image 1 should appear wearing the same outfit and in the same pose as image 2. All skin (face, neck, chest, arms, hands) must match the person from image 1. Keep background and lighting from image 2.`;

  console.log("[generate] Starting generation:", generationId);
  console.log("[generate] Template:", template.slug, "| Template image:", template.template_image_url);
  console.log("[generate] Reference photo (face):", referencePhotos[0]);
  console.log("[generate] Reference photos available:", referencePhotos.length, "(using first)");
  console.log("[generate] Prompt:", prompt);

  // 2. Generate via Kie.ai (nano-banana-pro)
  try {
    console.log("[generate] Calling Kie.ai nano-banana-pro...");
    const imageBuffer = await generateImage({
      referencePhotoUrls: [referencePhotos[0]],
      templateImageUrl: template.template_image_url,
      prompt,
    });

    console.log(`[generate] Image received, size: ${imageBuffer.length} bytes. Saving...`);
    const storedUrl = await saveGeneratedImage(imageBuffer, generationId, 1);
    console.log(`[generate] Saved to ${storedUrl}`);

    const processingTime = Date.now() - startTime;
    console.log(`[generate] Done. time=${processingTime}ms`);

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
    console.error("[generate] FAILED:", msg);

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

/**
 * Update a specific variant's status and URL.
 * Uses service_role client.
 */
export async function updateVariant(
  generationId: string,
  variantIndex: number,
  status: string,
  url?: string
): Promise<void> {
  const supabase = createServiceClient();

  const update: Record<string, unknown> = {
    [`variant_${variantIndex}_status`]: status,
  };

  if (url) {
    update[`variant_${variantIndex}_url`] = url;
  }

  await supabase
    .from("ai_photo_generations")
    .update(update)
    .eq("id", generationId);
}
