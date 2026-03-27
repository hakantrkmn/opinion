"use client";

import { Image as ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CommentImageProps {
  photoUrl: string;
  commentId: string;
}

export default function CommentImage({
  photoUrl,
  commentId,
}: CommentImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageTimeout, setImageTimeout] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const imageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset image states when photo URL changes and setup timeout
  useEffect(() => {
    // Clear any existing timeouts
    if (imageTimeoutRef.current) {
      clearTimeout(imageTimeoutRef.current);
      imageTimeoutRef.current = null;
    }
    if (cacheCheckTimeoutRef.current) {
      clearTimeout(cacheCheckTimeoutRef.current);
      cacheCheckTimeoutRef.current = null;
    }

    setImageLoaded(false);
    setImageError(false);
    setImageTimeout(false);

    // Set a timeout for image loading (15 seconds, increased for slower connections)
    if (photoUrl) {
      imageTimeoutRef.current = setTimeout(() => {
        if (imageTimeoutRef.current) {
          setImageTimeout(true);
        }
      }, 15000);
    }

    return () => {
      if (imageTimeoutRef.current) {
        clearTimeout(imageTimeoutRef.current);
        imageTimeoutRef.current = null;
      }
      if (cacheCheckTimeoutRef.current) {
        clearTimeout(cacheCheckTimeoutRef.current);
        cacheCheckTimeoutRef.current = null;
      }
    };
  }, [photoUrl, commentId]);

  // Additional check for cached images after a short delay
  useEffect(() => {
    if (photoUrl && !imageLoaded && !imageError && !imageTimeout) {
      cacheCheckTimeoutRef.current = setTimeout(() => {
        if (!imageLoaded && !imageError && !imageTimeout) {
          const testImg = new window.Image();
          testImg.onload = () => {
            setImageLoaded(true);
            setImageTimeout(false);
            if (imageTimeoutRef.current) {
              clearTimeout(imageTimeoutRef.current);
              imageTimeoutRef.current = null;
            }
          };
          testImg.onerror = () => {
            // Image not in cache or failed to load
          };
          testImg.src = photoUrl;
        }
      }, 1000);
    }

    return () => {
      if (cacheCheckTimeoutRef.current) {
        clearTimeout(cacheCheckTimeoutRef.current);
        cacheCheckTimeoutRef.current = null;
      }
    };
  }, [photoUrl, imageLoaded, imageError, imageTimeout]);

  // Handle keyboard events for full image modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showFullImage) {
        setShowFullImage(false);
      }
    };

    if (showFullImage) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [showFullImage]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (imageTimeoutRef.current) {
        clearTimeout(imageTimeoutRef.current);
        imageTimeoutRef.current = null;
      }
      if (cacheCheckTimeoutRef.current) {
        clearTimeout(cacheCheckTimeoutRef.current);
        cacheCheckTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className="mb-3 relative">
      <div className="relative inline-block">
        {/* Show timeout only if image genuinely hasn't loaded and no error */}
        {!imageError && (!imageTimeout || imageLoaded) ? (
          <>
            {!imageLoaded && (
              <div className="w-20 h-20 flex items-center justify-center bg-muted rounded-lg">
                <ImageIcon className="h-6 w-6 text-muted-foreground animate-pulse" />
              </div>
            )}
            <img
              src={photoUrl}
              alt="Comment photo"
              width={80}
              height={80}
              className={`w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity duration-200 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
              decoding="async"
              onClick={() => setShowFullImage(true)}
              onLoad={() => {
                setImageLoaded(true);
                setImageTimeout(false);
                if (imageTimeoutRef.current) {
                  clearTimeout(imageTimeoutRef.current);
                  imageTimeoutRef.current = null;
                }
              }}
              onError={() => {
                setImageError(true);
              }}
              style={{
                display: imageLoaded ? "block" : "none",
                minHeight: "1px",
              }}
              ref={(img) => {
                if (img && img.complete && img.naturalWidth > 0) {
                  setImageLoaded(true);
                  setImageTimeout(false);
                  if (imageTimeoutRef.current) {
                    clearTimeout(imageTimeoutRef.current);
                    imageTimeoutRef.current = null;
                  }
                }
              }}
            />
          </>
        ) : (
          <div className="w-20 h-20 flex items-center justify-center bg-muted rounded-lg">
            <div className="flex flex-col items-center space-y-1">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground text-center">
                {imageTimeout && !imageLoaded && !imageError
                  ? "Timeout"
                  : "Error"}
              </span>
              {photoUrl && (
                <button
                  onClick={() => {
                    setImageError(false);
                    setImageTimeout(false);
                    setImageLoaded(false);
                  }}
                  className="text-xs text-primary hover:text-primary/80 underline"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Image Modal */}
      {showFullImage && (
        <div
          className="fixed inset-0 backdrop-blur-md bg-background/20 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={photoUrl}
              alt="Comment photo - full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{
                width: "auto",
                height: "auto",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
              loading="lazy"
              decoding="async"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 text-primary-foreground hover:text-primary-foreground/80 text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full bg-foreground/50 hover:bg-foreground/70 transition-colors"
              aria-label="Close image"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
