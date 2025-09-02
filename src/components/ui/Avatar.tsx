"use client";

import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fallbackText?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const sizePixels = {
  sm: 32,
  md: 40, 
  lg: 48,
  xl: 64,
};

// Simple in-memory cache for images - use global window cache for consistency
const getImageCache = (): Map<string, boolean> => {
  if (typeof window !== "undefined") {
    const windowWithCache = window as unknown as {
      __avatarImageCache?: Map<string, boolean>;
    };
    if (!windowWithCache.__avatarImageCache) {
      windowWithCache.__avatarImageCache = new Map<string, boolean>();
    }
    return windowWithCache.__avatarImageCache;
  }
  // Fallback for SSR
  return new Map<string, boolean>();
};

const imageCache = getImageCache();

export function Avatar({
  src,
  alt = "Avatar",
  size = "md",
  className,
  fallbackText,
}: AvatarProps) {
  const [imageLoaded, setImageLoaded] = useState(() => {
    // Check cache first
    const cache = getImageCache();
    return src ? cache.get(src) ?? false : false;
  });
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    if (src) {
      const cache = getImageCache();
      cache.set(src, true);
      setImageLoaded(true);
    }
  };

  const handleImageError = () => {
    setImageError(true);
    if (src) {
      const cache = getImageCache();
      cache.delete(src);
    }
  };

  const shouldShowImage = src && !imageError && imageLoaded;
  const shouldShowFallback = !src || imageError || !imageLoaded;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-muted overflow-hidden flex-shrink-0",
        sizeClasses[size],
        className
      )}
    >
      {/* Image */}
      {src && !imageError && (
        <Image
          src={src}
          alt={alt}
          width={sizePixels[size]}
          height={sizePixels[size]}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            "object-cover transition-opacity duration-200",
            shouldShowImage ? "opacity-100" : "opacity-0"
          )}
          sizes={`${sizePixels[size]}px`}
          loading="lazy"
          placeholder="empty"
        />
      )}

      {/* Fallback */}
      {shouldShowFallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {fallbackText ? (
            <span className="font-medium text-muted-foreground uppercase">
              {fallbackText.charAt(0)}
            </span>
          ) : (
            <User
              className={cn(
                "text-muted-foreground",
                size === "sm" && "w-4 h-4",
                size === "md" && "w-5 h-5",
                size === "lg" && "w-6 h-6",
                size === "xl" && "w-8 h-8"
              )}
            />
          )}
        </div>
      )}

      {/* Loading spinner */}
      {src && !imageError && !imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div
            className={cn(
              "animate-spin rounded-full border-2 border-primary border-t-transparent",
              size === "sm" && "w-3 h-3",
              size === "md" && "w-4 h-4",
              size === "lg" && "w-5 h-5",
              size === "xl" && "w-6 h-6"
            )}
          />
        </div>
      )}
    </div>
  );
}

// Clear cache function for memory management
export const clearAvatarCache = () => {
  const cache = getImageCache();
  cache.clear();
};
