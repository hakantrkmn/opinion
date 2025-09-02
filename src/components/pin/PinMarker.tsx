"use client";

import type { Pin } from "@/types";
import { parseLocation } from "@/utils/mapUtils";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { generatePinElementHTML } from "./PinElementHTML";

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
            ${pin.comments_count && pin.comments_count > 0
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
  const [zoomLevel, setZoomLevel] = useState<number>(0);

  useEffect(() => {
    if (!map) return;

    // İlk zoom seviyesini al
    setZoomLevel(map.getZoom());

    // Zoom değişikliklerini dinle
    const handleZoom = () => {
      setZoomLevel(map.getZoom());
    };

    map.on('zoom', handleZoom);

    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;

    // Koordinatları çıkar
    const [lng, lat] = parseLocation(pin.location);

    // Pin element'i için container oluştur
    const pinContainer = document.createElement("div");

    // generatePinElementHTML fonksiyonunu zoom seviyesi ile kullan
    pinContainer.innerHTML = generatePinElementHTML(pin, zoomLevel);

    // Click handler'ı ekle
    const pinElement = pinContainer.firstElementChild as HTMLElement;
    if (pinElement) {
      pinElement.addEventListener("click", (e) => {
        e.stopPropagation();
        onPinClick(pin);
      });
    }

    // Mevcut marker'ı temizle
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Yeni marker oluştur
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
  }, [map, pin, onPinClick, zoomLevel]);

  return null; // Bu komponent görsel element döndürmez
}

// Export utility functions for backward compatibility
export { generatePinElementHTML } from "./PinElementHTML";
export { generatePinPopupHTML } from "./PinPopupHTML";