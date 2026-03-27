"use client";

import type { Pin } from "@/types";
import { getActivityBadge } from "@/utils/mapUtils";

// Pin Popup Component - HTML string generator
export function generatePinPopupHTML(pin: Pin): string {
  const userName = pin.user?.display_name || "Anonymous";
  const commentCount = pin.comments_count || 0;
  const createdDate = new Date(pin.created_at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const MAX_PIN_NAME_LENGTH = 28;
  const displayName =
    pin.name.length > MAX_PIN_NAME_LENGTH
      ? pin.name.slice(0, MAX_PIN_NAME_LENGTH) + "…"
      : pin.name;

  const activityBadge = getActivityBadge(commentCount);

  const isHot = commentCount > 10;
  const isPopular = commentCount > 3;
  const isActive = commentCount > 0;

  const accentGradient = isHot
    ? "linear-gradient(135deg, #f59e0b, #ef4444)"
    : isPopular
    ? "linear-gradient(135deg, #8b5cf6, #6366f1)"
    : isActive
    ? "linear-gradient(135deg, #6366f1, #3b82f6)"
    : "linear-gradient(135deg, #64748b, #94a3b8)";

  const badgeBg = isHot
    ? "background: rgba(239, 68, 68, 0.12); color: #ef4444;"
    : isPopular
    ? "background: rgba(99, 102, 241, 0.12); color: #6366f1;"
    : isActive
    ? "background: rgba(59, 130, 246, 0.12); color: #3b82f6;"
    : "background: rgba(100, 116, 139, 0.1); color: #64748b;";

  return `
    <div id="pin-popup" style="position: relative; width: 280px; background: var(--background); border-radius: 16px; overflow: hidden; cursor: pointer; border: 1px solid var(--border); box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);">
      <!-- Accent bar -->
      <div style="height: 3px; background: ${accentGradient};"></div>

      <div style="padding: 16px;">
        <!-- Header -->
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--foreground); line-height: 1.3; flex: 1;" title="${pin.name}">
            ${displayName}
          </h3>
          <span style="flex-shrink: 0; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; ${badgeBg}">
            ${activityBadge.text}
          </span>
        </div>

        <!-- Meta row -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 22px; height: 22px; border-radius: 50%; ${isActive ? 'background: ' + accentGradient : 'background: var(--muted)'}; display: flex; align-items: center; justify-content: center;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${isActive ? 'white' : 'var(--muted-foreground)'}" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <span style="font-size: 13px; color: var(--muted-foreground);">${userName}</span>
          </div>
          <span style="font-size: 11px; color: var(--muted-foreground); opacity: 0.7;">${createdDate}</span>
        </div>

        <!-- Footer -->
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style="font-size: 13px; font-weight: 600; color: var(--foreground);">
              ${commentCount} ${commentCount === 1 ? "comment" : "comments"}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted-foreground); opacity: 0.6;">
            <span>Tap to open</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  `;
}
