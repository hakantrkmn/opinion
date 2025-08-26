"use client";

import { User } from "lucide-react";
import { useState } from "react";

interface UserMarkerProps {
    className?: string;
    avatarUrl?: string | null;
    displayName?: string;
}

export default function UserMarker({ className = "", avatarUrl, displayName }: UserMarkerProps) {
    const [imageError, setImageError] = useState(false);

    const handleImageError = () => {
        setImageError(true);
    };

    return (
        <div className={`relative animate-bounce ${className}`}>
            {avatarUrl && !imageError ? (
                <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg overflow-hidden">
                    <img
                        src={avatarUrl}
                        alt={displayName || "User"}
                        onError={handleImageError}
                        className="w-full h-full object-cover"
                    />
                </div>
            ) : (
                <div className="w-8 h-8 bg-black rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                </div>
            )}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
        </div>
    );
}

// HTML string generator for map marker
export const generateUserMarkerHTML = (avatarUrl?: string | null, displayName?: string): string => {
    if (avatarUrl) {
        return `
        <div class="relative animate-bounce">
            <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg bg-black flex items-center justify-center overflow-hidden">
                <img
                    src="${avatarUrl}"
                    alt="${displayName || 'User'}"
                    class="w-full h-full object-cover absolute inset-0"
                    style="z-index: 1;"
                />
                <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" style="z-index: 0;">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                </svg>
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
        </div>
        `;
    }
    
    return `
    <div class="relative animate-bounce">
      <div class="w-8 h-8 bg-black rounded-full border-2 border-white shadow-lg flex items-center justify-center">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
    </div>
  `;
};
