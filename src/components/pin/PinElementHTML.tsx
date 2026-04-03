"use client";

import type { Pin } from "@/types";
import { pinIconHTML } from "@/components/icons/PinIcon";

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
      ? pin.name.slice(0, MAX_NAME_LENGTH) + "\u2026"
      : pin.name;

  // Consistent color palette: emerald (active), amber (hot), zinc (inactive)
  const markerBg = isHot
    ? "background: #f59e0b"
    : isPopular
    ? "background: #10b981"
    : isActive
    ? "background: #10b981"
    : "background: #71717a";

  const pulseColor = isHot
    ? "rgba(245, 158, 11, 0.3)"
    : isActive
    ? "rgba(16, 185, 129, 0.25)"
    : "rgba(113, 113, 122, 0.15)";

  const shadowColor = isHot
    ? "rgba(245, 158, 11, 0.4)"
    : isActive
    ? "rgba(16, 185, 129, 0.3)"
    : "rgba(113, 113, 122, 0.25)";

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
            : pinIconHTML(16, "white")
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
