import "server-only";
import sharp from "sharp";
import type { PhotoMetadata } from "@/types/api";

/** Hard cap on uploaded file size, checked before decoding. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Reject decompression bombs: ~50 MP is far beyond any phone camera. */
const MAX_INPUT_PIXELS = 50_000_000;

/**
 * Raster formats we accept as input (as detected by libvips from the bytes,
 * never from the client-supplied MIME type or extension). SVG/PDF and other
 * vector or document formats are deliberately excluded.
 */
const ALLOWED_INPUT_FORMATS = new Set([
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "heif",
  "tiff",
]);

export type ImagePreset = "comment-photo" | "avatar";

const PRESETS: Record<
  ImagePreset,
  { width: number; height: number; fit: "inside" | "cover"; quality: number }
> = {
  "comment-photo": { width: 2048, height: 2048, fit: "inside", quality: 80 },
  avatar: { width: 512, height: 512, fit: "cover", quality: 82 },
};

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

/**
 * Decode → auto-rotate by EXIF → resize → re-encode as WebP. The output never
 * carries the original metadata (EXIF/GPS/XMP/ICC are dropped because we
 * don't call `withMetadata`). Throws ImageProcessingError for anything that
 * is not a decodable raster image.
 */
export async function processImage(
  input: Buffer,
  preset: ImagePreset
): Promise<{ buffer: Buffer; metadata: PhotoMetadata }> {
  if (input.length === 0) throw new ImageProcessingError("Empty file");
  if (input.length > MAX_UPLOAD_BYTES) {
    throw new ImageProcessingError("File size must be less than 10MB");
  }

  const options = {
    failOn: "error" as const,
    limitInputPixels: MAX_INPUT_PIXELS,
    // Only the first frame of animated GIF/WebP.
    pages: 1,
  };

  let format: string | undefined;
  try {
    const meta = await sharp(input, options).metadata();
    format = meta.format;
  } catch {
    throw new ImageProcessingError("File is not a supported image");
  }
  if (!format || !ALLOWED_INPUT_FORMATS.has(format)) {
    throw new ImageProcessingError(
      "Only JPEG, PNG, WebP, GIF, AVIF or HEIF images are allowed"
    );
  }

  const p = PRESETS[preset];
  try {
    const { data, info } = await sharp(input, options)
      .rotate()
      .resize(p.width, p.height, {
        fit: p.fit,
        position: "centre",
        withoutEnlargement: p.fit === "inside",
      })
      .webp({ quality: p.quality })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: data,
      metadata: {
        width: info.width,
        height: info.height,
        file_size: info.size,
        format: "webp",
      },
    };
  } catch {
    throw new ImageProcessingError("Could not process image");
  }
}
