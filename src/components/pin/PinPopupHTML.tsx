"use client";

import type { Pin } from "@/types";
import { getActivityBadge } from "@/utils/mapUtils";
// Pin Popup Component - HTML string generator
export function generatePinPopupHTML(pin: Pin): string {
  const userName = pin.user?.display_name || "Anonim";
  const commentCount = pin.comments_count || 0;
  const createdDate = new Date(pin.created_at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Truncate pin name if too long
  const MAX_PIN_NAME_LENGTH = 25;
  const displayName =
    pin.name.length > MAX_PIN_NAME_LENGTH
      ? pin.name.slice(0, MAX_PIN_NAME_LENGTH) + "..."
      : pin.name;

  const activityBadge = getActivityBadge(commentCount);

  return `
    <div class="relative p-4 max-w-sm cursor-pointer hover:bg-muted transition-colors rounded-lg bg-background border shadow-lg" id="pin-popup">
      <!-- Close Button -->
      <button class="absolute top-2 right-2 w-6 h-6 bg-muted hover:bg-muted rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-20" onclick="event.stopPropagation(); this.closest('.maplibregl-popup').remove()">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      <div class="mb-3 pr-8">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xl font-bold text-foreground leading-tight truncate flex-1 mr-2" title="${
            pin.name
          }">
            ${displayName}
          </h3>
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            activityBadge.color
          } z-10 flex-shrink-0">
            ${activityBadge.text}
          </span>
        </div>
      </div>

      <div class="mb-3">
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">
            Created by: <span class="font-medium text-foreground">${userName}</span>
          </p>
          <p class="text-xs text-muted-foreground">${createdDate}</p>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg class="w-4 h-4 text-muted-foreground mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
          </svg>
          <span class="text-sm text-foreground font-medium">${commentCount} ${
    commentCount === 1 ? "comment" : "comments"
  }</span>
        </div>

        <div class="text-xs text-muted-foreground">
          Click to open
        </div>
      </div>
    </div>
  `;
}
