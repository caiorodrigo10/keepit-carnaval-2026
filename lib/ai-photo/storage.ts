import { createServiceClient } from "@/lib/supabase/service";

const BUCKET = "ai-photos";

/**
 * Save a generated image buffer directly to Supabase Storage.
 * Gemini returns the image as a Buffer, so no download needed.
 *
 * Uses the service_role client to bypass RLS.
 */
export async function saveGeneratedImage(
  imageBuffer: Buffer,
  generationId: string,
  variantIndex: number
): Promise<string> {
  const supabase = createServiceClient();
  const path = `generated/${generationId}/variant_${variantIndex}.png`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    throw new Error(`Erro ao salvar imagem no storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
