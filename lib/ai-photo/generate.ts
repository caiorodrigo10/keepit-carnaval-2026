import { createServiceClient } from "@/lib/supabase/service";
import { generateImage, analyzeReferencePhotos } from "./kie-client";
import { saveGeneratedImage } from "./storage";
import { applyWatermark } from "./watermark";
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

  // Use up to 5 reference photos for better facial fidelity (model supports up to 5 for humans)
  const selectedRefs = referencePhotos.slice(0, 5);
  const refCount = selectedRefs.length;
  const refRange = refCount === 1 ? "image 1" : `images 1-${refCount}`;
  const lastIdx = refCount + 1; // template is the last image in the array

  // V10: Pre-analyze ALL templates with Gemini 2.5 Flash for personalized prompts.
  // BACKUP V5 saved in PESQUISA-NANO-BANANA-PRO.md
  let personDescription = "";
  try {
    personDescription = await analyzeReferencePhotos(selectedRefs);
    console.log("[generate] Pre-analysis result:", personDescription);
  } catch (analysisError) {
    console.warn("[generate] Pre-analysis failed, using generic prompt:", analysisError);
  }

  let prompt: string;

  if (personDescription) {
    prompt = [
      `Replace the person in image ${lastIdx} with the person from ${refRange}.`,
      `The person from the reference is: ${personDescription}`,
      `The ENTIRE body must match this description — skin tone, gender, body build, age, and all physical traits must be uniform from head to toe.`,
      `Every visible body part (face, neck, arms, hands, legs, chest) must have the exact same skin tone described above.`,
      `Keep the same clothes, accessories, pose, and background from image ${lastIdx}.`,
      `Do NOT keep any physical traits from the original person in image ${lastIdx}.`,
      `Preserve 100% of the facial features from ${refRange}: exact face shape, eye color, skin texture, and all distinctive marks.`,
      `Natural skin texture with visible pores — not airbrushed or plastic.`,
      `Seamlessly blend into the scene: match lighting, shadows, and color temperature from image ${lastIdx}.`,
      `Photorealistic 8K quality, 85mm lens at f/1.8, three-point lighting.`,
    ].join(" ");
  } else {
    // Fallback without pre-analysis
    prompt = [
      `Replace the person in image ${lastIdx} with the person from ${refRange}.`,
      `Adapt the body structure, skin color, gender, and build to match the person from ${refRange}.`,
      `The skin tone must be uniform across the entire body — face, arms, hands, neck, and all visible parts must match.`,
      `Keep the same clothes, accessories, pose, and background from image ${lastIdx}.`,
      `Do NOT keep any physical traits from the original person in image ${lastIdx}.`,
      `Preserve 100% of the facial features from ${refRange}.`,
      `Natural skin texture with visible pores. Photorealistic 8K quality, 85mm lens at f/1.8.`,
    ].join(" ");
  }

  console.log("[generate] Starting generation:", generationId);
  console.log("[generate] Template:", template.slug, "| Template image:", template.template_image_url);
  console.log("[generate] Reference photos:", selectedRefs.length, "of", referencePhotos.length);
  console.log("[generate] Prompt:", prompt);

  // 2. Generate via Kie.ai (nano-banana-pro)
  try {
    console.log("[generate] Calling Kie.ai nano-banana-pro...");
    const imageBuffer = await generateImage({
      referencePhotoUrls: selectedRefs,
      templateImageUrl: template.template_image_url,
      prompt,
      aspectRatio: template.aspect_ratio,
      resolution: template.resolution || "2K",
    });

    console.log(`[generate] Image received, size: ${imageBuffer.length} bytes. Saving original...`);

    // Save original first (fallback seguro)
    let storedUrl = await saveGeneratedImage(imageBuffer, generationId, 1);
    console.log(`[generate] Original saved to ${storedUrl}`);

    // Apply watermark on a COPY of the buffer (separate sharp instances)
    try {
      const watermarkedBuffer = await applyWatermark(Buffer.from(imageBuffer));
      console.log(`[generate] Watermark applied, size: ${watermarkedBuffer.length} bytes. Replacing...`);
      storedUrl = await saveGeneratedImage(watermarkedBuffer, generationId, 1);
      console.log(`[generate] Watermarked version saved to ${storedUrl}`);
    } catch (wmError) {
      console.warn("[generate] Watermark failed, keeping original:", wmError);
    }

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
