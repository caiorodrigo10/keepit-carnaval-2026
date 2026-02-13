/**
 * Upload template images to Supabase Storage and update database URLs.
 * Run with: npx tsx scripts/upload-templates.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const TEMPLATES = [
  { slug: "bateria-percussao", file: "keepittemplate1.jpg" },
  { slug: "rainha-bateria", file: "keepittemplate2.jpg" },
  { slug: "rainha-close", file: "keepittemplate3.jpg" },
  { slug: "musa-carnaval", file: "keepittemplate4.jpg" },
  { slug: "musa-close", file: "keepittemplate5.jpg" },
];

async function main() {
  for (const t of TEMPLATES) {
    const filePath = join(process.cwd(), "public", "modeloskeepit", t.file);
    const buffer = readFileSync(filePath);
    const storagePath = `templates/${t.file}`;

    console.log(`Uploading ${t.file} (${buffer.length} bytes)...`);

    const { error: uploadError } = await supabase.storage
      .from("ai-photos")
      .upload(storagePath, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error(`  Upload failed for ${t.file}:`, uploadError.message);
      continue;
    }

    const { data } = supabase.storage.from("ai-photos").getPublicUrl(storagePath);
    const publicUrl = data.publicUrl;
    console.log(`  Uploaded: ${publicUrl}`);

    // Update database
    const { error: updateError } = await supabase
      .from("ai_photo_templates")
      .update({ template_image_url: publicUrl })
      .eq("slug", t.slug);

    if (updateError) {
      console.error(`  DB update failed for ${t.slug}:`, updateError.message);
    } else {
      console.log(`  Updated DB: ${t.slug} → ${publicUrl}`);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
