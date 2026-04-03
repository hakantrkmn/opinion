import sharp from "sharp";
import type { PhotoCompressionOptions } from "@/types";

const DEFAULT_OPTIONS: PhotoCompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 80,
  format: "webp",
};

/**
 * Compress image file using sharp (server-side)
 */
export async function compressImage(
  file: File,
  options: Partial<PhotoCompressionOptions> = {}
): Promise<{ file: File; metadata: Record<string, unknown> }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const buffer = Buffer.from(await file.arrayBuffer());

  const image = sharp(buffer);
  const originalMeta = await image.metadata();

  const compressed = await image
    .resize(opts.maxWidth, opts.maxHeight, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: typeof opts.quality === "number" && opts.quality <= 1 ? Math.round(opts.quality * 100) : opts.quality })
    .toBuffer();

  const compressedMeta = await sharp(compressed).metadata();

  const compressedFile = new File(
    [new Uint8Array(compressed)],
    generateFileName(file.name, opts.format),
    { type: `image/${opts.format}` }
  );

  const metadata = {
    original_size: file.size,
    compressed_size: compressed.length,
    compression_ratio: (1 - compressed.length / file.size) * 100,
    width: compressedMeta.width ?? originalMeta.width ?? 0,
    height: compressedMeta.height ?? originalMeta.height ?? 0,
    format: opts.format,
    quality: opts.quality,
  };

  return { file: compressedFile, metadata };
}

/**
 * Generate filename with proper extension
 */
function generateFileName(originalName: string, format: string): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const timestamp = Date.now();
  return `${nameWithoutExt}_${timestamp}.${format}`;
}

/**
 * Check if compression is needed
 */
export function needsCompression(file: File): boolean {
  const threshold = 200 * 1024; // 200KB
  return file.size > threshold;
}

/**
 * Validate if compression was successful
 */
export function validateCompression(
  originalSize: number,
  compressedSize: number
): boolean {
  const maxTargetSize = 500 * 1024;
  if (compressedSize > maxTargetSize) {
    console.warn(`Compressed file still too large: ${compressedSize} bytes`);
    return false;
  }
  return true;
}
