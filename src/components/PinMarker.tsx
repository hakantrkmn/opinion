"use client";

import type { Pin } from "@/types";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

interface PinMarkerProps {
  pin: Pin;
  map: maplibregl.Map | null;
  onPinClick: (pin: Pin) => void;
}

export default function PinMarker({ pin, map, onPinClick }: PinMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // PostGIS location'dan koordinatları çıkar
  const parseLocation = (location: any): [number, number] => {
    if (!location) {
      console.warn("Invalid location:", location);
      return [0, 0];
    }

    // GeoJSON formatı kontrol et
    if (location.type === "Point" && location.coordinates) {
      const [lng, lat] = location.coordinates;
      return [lng, lat];
    }

    // String formatı kontrol et (eski format)
    if (typeof location === "string") {
      const match = location.match(/POINT\(([^)]+)\)/);
      if (match) {
        const [lng, lat] = match[1].split(" ").map(Number);
        return [lng, lat];
      }
    }

    console.warn("Could not parse location:", location);
    return [0, 0];
  };

  useEffect(() => {
    if (!map) return;

    // Koordinatları çıkar
    const [lng, lat] = parseLocation(pin.location);

    // Pin elementi oluştur
    const pinElement = document.createElement("div");
    pinElement.className = "pin-marker";
    pinElement.innerHTML = `
      <div class="relative">
        <div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-red-500"></div>
      </div>
    `;

    // Marker oluştur
    markerRef.current = new maplibregl.Marker({
      element: pinElement,
      anchor: "bottom",
    })
      .setLngLat([lng, lat])
      .addTo(map);

    // Pin'e tıklama olayı
    pinElement.addEventListener("click", (e) => {
      e.stopPropagation();
      onPinClick(pin);
    });

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [map, pin, onPinClick]);

  return null; // Bu komponent görsel element döndürmez
}
