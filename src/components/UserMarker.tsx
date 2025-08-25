"use client";

import { User } from "lucide-react";

interface UserMarkerProps {
    className?: string;
}

export default function UserMarker({ className = "" }: UserMarkerProps) {
    return (
        <div className={`relative animate-bounce ${className}`}>
            <div className="w-8 h-8 bg-black rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
        </div>
    );
}

// HTML string generator for map marker
export const generateUserMarkerHTML = (): string => {
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
