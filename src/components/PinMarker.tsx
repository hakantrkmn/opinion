"use client";

import type { Pin } from "@/types";
import { parseLocation } from "@/utils/mapUtils";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

// Pin Element Component - Sadece HTML oluşturur
interface PinElementProps {
  pin: Pin;
  onClick?: () => void;
}

export function PinElement({ pin, onClick }: PinElementProps) {
  // Pin elementini oluştur
  const elementRef = useRef<HTMLDivElement | null>(null);

  // Pin'in yorum sayısına göre renk belirle
  const getPinColor = (commentCount?: number) => {
    if (!commentCount || commentCount === 0)
      return "bg-red-500 hover:bg-red-600";
    if (commentCount <= 3) return "bg-blue-500 hover:bg-blue-600";
    if (commentCount <= 10) return "bg-green-500 hover:bg-green-600";
    return "bg-purple-500 hover:bg-purple-600";
  };

  useEffect(() => {
    if (elementRef.current) {
      const pinColor = getPinColor(pin.comments_count);

      elementRef.current.innerHTML = `
        <div class="relative">
          <div class="w-6 h-6 ${pinColor} rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transition-colors">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
            ${
              pin.comments_count && pin.comments_count > 0
                ? `
              <div class="absolute -top-1 -right-1 bg-white text-gray-700 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-sm z-10">
                ${pin.comments_count > 99 ? "99+" : pin.comments_count}
              </div>
            `
                : ""
            }
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-red-500"></div>
        </div>
      `;

      // Tıklama olayını ekle
      if (onClick) {
        elementRef.current.addEventListener("click", (e) => {
          e.stopPropagation();
          onClick();
        });
      }
    }
  }, [pin, onClick]);

  return <div ref={elementRef} className="pin-marker" onClick={onClick} />;
}

// Ana PinMarker Component
interface PinMarkerProps {
  pin: Pin;
  map: maplibregl.Map | null;
  onPinClick: (pin: Pin) => void;
}

export default function PinMarker({ pin, map, onPinClick }: PinMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Koordinatları çıkar
    const [lng, lat] = parseLocation(pin.location);

    // Pin element'i için container oluştur
    const pinContainer = document.createElement("div");

    // generatePinElementHTML fonksiyonunu kullan
    pinContainer.innerHTML = generatePinElementHTML(pin);

    // Click handler'ı ekle
    const pinElement = pinContainer.firstElementChild as HTMLElement;
    if (pinElement) {
      pinElement.addEventListener("click", (e) => {
        e.stopPropagation();
        onPinClick(pin);
      });
    }

    // Marker oluştur
    markerRef.current = new maplibregl.Marker({
      element: pinElement,
      anchor: "bottom",
    })
      .setLngLat([lng, lat])
      .addTo(map);

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [map, pin, onPinClick]);

  return null; // Bu komponent görsel element döndürmez
}

// Pin Popup Component - HTML string generator
export function generatePinPopupHTML(pin: Pin): string {
  const userName = pin.user?.display_name || "Anonim";
  const commentCount = pin.comments_count || 0;
  const createdDate = new Date(pin.created_at).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Pin'in aktiflik seviyesine göre badge
  const getActivityBadge = (count?: number) => {
    if (!count || count === 0)
      return { text: "Yeni", color: "bg-green-100 text-green-800" };
    if (count <= 3)
      return { text: "Aktif", color: "bg-blue-100 text-blue-800" };
    if (count <= 10)
      return { text: "Popüler", color: "bg-yellow-100 text-yellow-800" };
    return { text: "Çok Aktif", color: "bg-purple-100 text-purple-800" };
  };

  const activityBadge = getActivityBadge(commentCount);

  return `
    <div class="relative p-4 max-w-sm cursor-pointer hover:bg-gray-50 transition-colors rounded-lg bg-white shadow-lg" id="pin-popup">
      <!-- Close Button -->
      <button class="absolute top-2 right-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors z-20" onclick="event.stopPropagation(); this.closest('.maplibregl-popup').remove()">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>

      <div class="mb-3 pr-8">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-xl font-bold text-gray-800 leading-tight">
            ${pin.name}
          </h3>
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${activityBadge.color} z-10">
            ${activityBadge.text}
          </span>
        </div>
      </div>

      <div class="mb-3">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-600">
            Oluşturan: <span class="font-medium">${userName}</span>
          </p>
          <p class="text-xs text-gray-400">${createdDate}</p>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg class="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
          </svg>
          <span class="text-sm text-gray-600 font-medium">${commentCount} yorum</span>
        </div>

        <div class="text-xs text-gray-400">
          📍 Pin'i aç
        </div>
      </div>
    </div>
  `;
}

// HTML String Generator - useMap.ts için
export function generatePinElementHTML(pin: Pin): string {
  // Pin'in yorum sayısına göre renk belirle
  const getPinColor = (commentCount?: number) => {
    if (!commentCount || commentCount === 0)
      return "bg-red-500 hover:bg-red-600";
    if (commentCount <= 3) return "bg-blue-500 hover:bg-blue-600";
    if (commentCount <= 10) return "bg-green-500 hover:bg-green-600";
    return "bg-purple-500 hover:bg-purple-600";
  };

  const pinColor = getPinColor(pin.comments_count);

  return `
    <div class="relative">
      <div class="w-6 h-6 ${pinColor} rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transition-colors">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
        </svg>
        ${
          pin.comments_count && pin.comments_count > 0
            ? `
          <div class="absolute -top-1 -right-1 bg-white text-gray-700 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-sm z-10">
            ${pin.comments_count > 99 ? "99+" : pin.comments_count}
          </div>
        `
            : ""
        }
      </div>
      <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-red-500"></div>
    </div>
  `;
}
