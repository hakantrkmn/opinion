"use client";

import type { Pin } from "@/types";
import { getPinColor } from "@/utils/mapUtils";

// HTML String Generator - useMap.ts için
export function generatePinElementHTML(pin: Pin, zoomLevel?: number): string {
  const commentCount = pin.comments_count || 0;
  const isActive = commentCount > 0;
  const isPopular = commentCount > 3;
  const isHot = commentCount > 10;

  // Get avatar URL from pin's user data
  const avatarUrl =
    pin.user?.avatar_url ||
    pin.profiles?.avatar_url ||
    (Array.isArray(pin.users) ? pin.users[0]?.avatar_url : pin.users?.avatar_url) ||
    null;

  // Zoom seviyesi 14 ve üzerinde pin adını göster
  const showPinName = zoomLevel && zoomLevel >= 14;

  // Pin adını kısalt (max 18 karakter)
  const MAX_NAME_LENGTH = 18;
  const truncatedName =
    pin.name.length > MAX_NAME_LENGTH
      ? pin.name.slice(0, MAX_NAME_LENGTH) + "…"
      : pin.name;

  // Dynamic color based on activity
  const markerBg = isHot
    ? "background: linear-gradient(135deg, #f59e0b, #ef4444)"
    : isPopular
    ? "background: linear-gradient(135deg, #8b5cf6, #6366f1)"
    : isActive
    ? "background: linear-gradient(135deg, #6366f1, #3b82f6)"
    : "background: linear-gradient(135deg, #64748b, #94a3b8)";

  const pulseColor = isHot
    ? "rgba(239, 68, 68, 0.3)"
    : isPopular
    ? "rgba(99, 102, 241, 0.3)"
    : isActive
    ? "rgba(59, 130, 246, 0.3)"
    : "rgba(148, 163, 184, 0.2)";

  const shadowColor = isHot
    ? "rgba(239, 68, 68, 0.4)"
    : isPopular
    ? "rgba(99, 102, 241, 0.35)"
    : isActive
    ? "rgba(59, 130, 246, 0.3)"
    : "rgba(100, 116, 139, 0.25)";

  return `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 2px 6px ${shadowColor});">
      ${
        showPinName
          ? `
        <div style="margin-bottom: 6px; padding: 3px 10px; background: var(--background); border: 1px solid var(--border); border-radius: 8px; font-size: 11px; font-weight: 600; color: var(--foreground); white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; backdrop-filter: blur(8px); box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          ${truncatedName}
        </div>
      `
          : ""
      }
      <div style="position: relative; width: 36px; height: 36px; border-radius: 50% 50% 50% 4px; ${markerBg}; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2.5px solid var(--background); box-shadow: 0 3px 12px ${shadowColor}; transition: transform 0.2s ease;">
        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
          ${avatarUrl
            ? `<img src="${avatarUrl}" alt="" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" />`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>`
          }
        </div>
        ${
          commentCount > 0
            ? `
          <div style="position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 4px; ${markerBg}; border-radius: 9px; border: 2px solid var(--background); display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: white; z-index: 10; box-shadow: 0 1px 4px rgba(0,0,0,0.15); transform: rotate(45deg);">
            ${commentCount > 99 ? "99+" : commentCount}
          </div>
        `
            : ""
        }
      </div>
      ${
        isActive
          ? `
        <div style="position: absolute; bottom: 0; left: 50%; width: 36px; height: 36px; margin-left: -18px; border-radius: 50%; background: ${pulseColor}; animation: pin-pulse 2s ease-out infinite; z-index: -1;"></div>
      `
          : ""
      }
    </div>
    <style>
      @keyframes pin-pulse {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(2.2); opacity: 0; }
      }
    </style>
  `;
}
