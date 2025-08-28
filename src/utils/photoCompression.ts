import type { PhotoCompressionOptions } from "@/types";

// Default compression options for optimal file size
const DEFAULT_OPTIONS: PhotoCompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8, // 80% quality for good balance
  format: "webp", // WebP for best compression
};

/**
 * Compress image file using Canvas API
 * Reduces file size from MB to KB while maintaining quality
 */
export async function compressImage(
  file: File,
  options: Partial<PhotoCompressionOptions> = {}
): Promise<{ file: File; metadata: Record<string, unknown> }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    if (!ctx) {
      reject(new Error("Canvas context not supported"));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        const { width, height } = calculateDimensions(
          img.width,
          img.height,
          opts.maxWidth,
          opts.maxHeight
        );

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"));
              return;
            }

            // Create new file from compressed blob
            const compressedFile = new File(
              [blob],
              generateFileName(file.name, opts.format),
              { type: `image/${opts.format}` }
            );

            const metadata = {
              original_size: file.size,
              compressed_size: compressedFile.size,
              compression_ratio: (1 - compressedFile.size / file.size) * 100,
              width,
              height,
              format: opts.format,
              quality: opts.quality,
            };

            console.log("Photo compression completed:", metadata);

            resolve({
              file: compressedFile,
              metadata,
            });
          },
          `image/${opts.format}`,
          opts.quality
        );
      } catch (error) {
        reject(new Error(`Compression error: ${error}`));
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for compression"));
    };

    // Load image for processing
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate optimal dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Scale down if needed
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.round(width), height: Math.round(height) };
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
 * Validate if compression was successful
 */
export function validateCompression(
  originalSize: number,
  compressedSize: number
): boolean {
  const maxTargetSize = 500 * 1024; // 500KB
  const minCompressionRatio = 0.1; // At least 10% compression

  // Check if file is small enough
  if (compressedSize > maxTargetSize) {
    console.warn(`Compressed file still too large: ${compressedSize} bytes`);
    return false;
  }

  // Check if compression was effective
  const ratio = compressedSize / originalSize;
  if (ratio > 1 - minCompressionRatio) {
    console.warn(`Compression not effective: ${(ratio * 100).toFixed(1)}%`);
  }

  return true;
}

/**
 * Progressive compression - try multiple quality levels if needed
 */
export async function progressiveCompress(
  file: File,
  targetSize: number = 300 * 1024 // 300KB target
): Promise<{ file: File; metadata: Record<string, unknown> }> {
  const qualityLevels = [0.8, 0.6, 0.4, 0.3]; // Try different quality levels

  for (const quality of qualityLevels) {
    try {
      const result = await compressImage(file, {
        quality,
        maxWidth: quality > 0.5 ? 1200 : 800, // Reduce dimensions for lower quality
        maxHeight: quality > 0.5 ? 1200 : 800,
      });

      // Check if target size achieved
      if (result.file.size <= targetSize) {
        console.log(
          `Target size achieved with quality ${quality}: ${result.file.size} bytes`
        );
        return result;
      }
    } catch (error) {
      console.warn(`Compression failed at quality ${quality}:`, error);
    }
  }

  // If all levels fail, return the last attempt
  return compressImage(file, { quality: 0.3, maxWidth: 600, maxHeight: 600 });
}

/**
 * Check if compression is needed
 */
export function needsCompression(file: File): boolean {
  const threshold = 200 * 1024; // 200KB
  return file.size > threshold;
}
