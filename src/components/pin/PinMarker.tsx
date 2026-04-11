"use client";

import type { Pin } from "@/types";
import { parseLocation } from "@/utils/mapUtils";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import { generatePinElementHTML } from "./PinElementHTML";
import { generatePinPopupHTML } from "./PinPopupHTML";

interface PinMarkerProps {
  pin: Pin;
  map: maplibregl.Map | null;
  onPopupClick: (pin: Pin) => void;
}

export default function PinMarker({ pin, map, onPopupClick }: PinMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  // Keep mutable values in refs so the effect only runs once per pin ID + map
  const onPopupClickRef = useRef(onPopupClick);
  onPopupClickRef.current = onPopupClick;
  const pinRef = useRef(pin);
  pinRef.current = pin;

  // Stable identity: only re-create marker when pin ID or map instance changes
  const pinId = pin.id;

  useEffect(() => {
    if (!map) return;

    const currentPin = pinRef.current;
    const [lng, lat] = parseLocation(currentPin.location);

    const el = document.createElement("div");
    el.className = "pin-marker";
    el.innerHTML = generatePinElementHTML(currentPin, map.getZoom());

    const popup = new maplibregl.Popup({
      closeButton: false,
      maxWidth: "350px",
      className: "custom-popup",
    }).setHTML(generatePinPopupHTML(currentPin));

    popup.on("open", () => {
      const popupEl = popup.getElement();
      if (!popupEl) return;

      popupEl.addEventListener(
        "click",
        () => {
          popup.remove();
          onPopupClickRef.current(pinRef.current);
        },
        { once: true }
      );
    });

    popupRef.current = popup;

    markerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

    const handleZoom = () => {
      el.innerHTML = generatePinElementHTML(pinRef.current, map.getZoom());
    };
    map.on("zoom", handleZoom);

    return () => {
      map.off("zoom", handleZoom);
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, pinId]);

  return null;
}

// Export utility functions for backward compatibility
export { generatePinElementHTML } from "./PinElementHTML";
export { generatePinPopupHTML } from "./PinPopupHTML";
