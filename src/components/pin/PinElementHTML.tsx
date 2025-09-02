"use client";

import type { Pin } from "@/types";
import { getPinColor } from "@/utils/mapUtils";

// HTML String Generator - useMap.ts için
export function generatePinElementHTML(pin: Pin, zoomLevel?: number): string {
  const pinColor = getPinColor(pin.comments_count);

  // Zoom seviyesi 14 ve üzerinde pin adını göster
  const showPinName = zoomLevel && zoomLevel >= 14;

  // Pin adını kısalt (max 20 karakter)
  const MAX_NAME_LENGTH = 20;
  const truncatedName =
    pin.name.length > MAX_NAME_LENGTH
      ? pin.name.slice(0, MAX_NAME_LENGTH) + "..."
      : pin.name;

  return `
    <div class="relative flex flex-col items-center">
      ${
        showPinName
          ? `
        <div class="mb-1 px-2 py-1 bg-background border rounded-md shadow-md text-xs font-medium text-foreground whitespace-nowrap max-w-32 truncate">
          ${truncatedName}
        </div>
      `
          : ""
      }
      <div class="w-6 h-6 ${pinColor} rounded-full border-2 border-background shadow-lg flex items-center justify-center cursor-pointer transition-colors">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
        </svg>
        ${
          pin.comments_count && pin.comments_count > 0
            ? `
          <div class="absolute -top-1 -right-1 bg-background text-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-sm border z-10">
            ${pin.comments_count > 99 ? "99+" : pin.comments_count}
          </div>
        `
            : ""
        }
      </div>
      <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent ${
        pin.comments_count && pin.comments_count > 0
          ? "border-t-blue-500 dark:border-t-blue-600"
          : "border-t-red-500 dark:border-t-red-600"
      }"></div>
    </div>
  `;
}
