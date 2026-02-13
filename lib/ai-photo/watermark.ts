/**
 * Apply watermark overlay to generated AI photos.
 * Uses sharp for fast, server-side image compositing.
 *
 * IMPORTANT: Each sharp operation uses its own instance to avoid
 * pipeline reuse issues (sharp streams are consumed on first read).
 */
import sharp from "sharp";
import path from "path";

const WATERMARK_PATH = path.join(process.cwd(), "public", "keepit-watermark.png");

const WATERMARK_WIDTH_RATIO = 0.25;
const PADDING_RATIO = 0.03;

/**
 * Overlay the Keepit watermark on the bottom-right of the image.
 * Returns the composited image as a Buffer (PNG).
 */
export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  // Instance 1: read metadata only
  const metadata = await sharp(imageBuffer).metadata();

  const imgWidth = metadata.width || 1024;
  const imgHeight = metadata.height || 1024;

  const wmWidth = Math.round(imgWidth * WATERMARK_WIDTH_RATIO);
  const padding = Math.round(imgWidth * PADDING_RATIO);

  // Separate instance for watermark resize
  const watermark = await sharp(WATERMARK_PATH)
    .resize({ width: wmWidth })
    .png()
    .toBuffer();

  const wmMeta = await sharp(watermark).metadata();
  const wmHeight = wmMeta.height || Math.round(wmWidth * 0.56);

  const left = Math.max(0, imgWidth - wmWidth - padding);
  const top = Math.max(0, imgHeight - wmHeight - padding);

  // Instance 2: fresh instance for composite (never reuses the metadata instance)
  const result = await sharp(imageBuffer)
    .composite([{ input: watermark, left, top }])
    .png()
    .toBuffer();

  return result;
}
