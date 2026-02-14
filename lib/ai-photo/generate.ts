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

  // V2 prompt: clothing swap + Sambódromo background
  // Randomize costume style for variety
  const costumeStyles = [
    "a luxurious samba school costume with large colorful feather headdress, sequined bodysuit with full coverage, ornate beaded cape, and sparkling accessories",
    "an elegant carnival royalty outfit with jeweled crown, flowing glitter cape, embroidered vest with rhinestones, and golden scepter accessories",
    "a vibrant Bahian-inspired carnival outfit with layered colorful skirts, beaded necklaces, turban headwrap with feathers, and ornate arm bands",
    "a modern carnival performer outfit with holographic sequined jacket, LED-style glowing accessories, metallic boots, and futuristic feather shoulder pieces",
    "a traditional samba school porta-bandeira/mestre-sala elegant outfit with flowing sequined fabric, large feathered hat, ornate embroidered details, and dramatic cape",
    "a tropicalia-inspired carnival look with fruit-adorned headdress, colorful ruffled costume, beaded jewelry layers, and sparkling body accessories",
  ];
  const randomStyle = costumeStyles[Math.floor(Math.random() * costumeStyles.length)];

  const prompt = [
    `Transform this photo: dress the person in ${randomStyle}.`,
    "IMPORTANT RULES FOR THE COSTUME: The outfit must provide FULL BODY COVERAGE appropriate for a family event — no exposed chest, no exposed midriff, no revealing cuts. The costume should be elaborate, colorful and glamorous while being fully covered and dignified.",
    "Automatically detect if the person is male or female and adapt the costume style accordingly — masculine cuts for men, feminine cuts for women.",
    "KEEP EXACTLY THE SAME: the person's face, facial features, skin tone, hair, body pose, and body proportions.",
    "ACCESSORIES: If the person is wearing glasses, sunglasses, hat, cap, or any accessory, KEEP the accessory but transform its style to match the carnival costume — e.g. regular glasses become jeweled carnival glasses, a cap becomes a feathered headpiece, sunglasses get glitter frames.",
    "CHANGE THE BACKGROUND: place the person in the Sambódromo do Anhembi in São Paulo during carnival night, with colorful lights, confetti in the air, crowd in the bleachers, and the carnival parade avenue visible behind them.",
    "The result must be photorealistic with proper lighting matching a nighttime carnival atmosphere with vibrant stage lights.",
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
