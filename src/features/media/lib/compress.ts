const MAX_DIMENSION = 1600;
const QUALITY = 0.82;
/** Originals above this are rejected before we even try to decode them. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
/** Fallback limit when the browser cannot decode the image (e.g. HEIC). */
const MAX_UNCOMPRESSED_BYTES = 5 * 1024 * 1024;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Downscales and re-encodes a photo on the client (WebP, JPEG fallback) so
 * uploads stay small. The server re-encodes again; this only saves bandwidth.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new Error("That photo is too large (max 25 MB).");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (file.size <= MAX_UNCOMPRESSED_BYTES) return file;
    throw new Error("This photo format isn't supported. Try a JPEG or PNG.");
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob = await toBlob(canvas, "image/webp", QUALITY);
  // Older Safari silently falls back to PNG for unsupported encoders.
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, "image/jpeg", QUALITY);
  }
  if (!blob || blob.size >= file.size) return file;

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.${ext}`, {
    type: blob.type,
    lastModified: Date.now(),
  });
}
