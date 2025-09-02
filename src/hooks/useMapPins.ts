import {
  generatePinElementHTML,
  generatePinPopupHTML,
} from "@/components/pin/PinMarker";
import type { CreatePinData, EnhancedComment, MapBounds, Pin } from "@/types";
import { parseLocation } from "@/utils/mapUtils";
import maplibregl from "maplibre-gl";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

export const useMapPins = (
  map: React.MutableRefObject<maplibregl.Map | null>,
  tempPin: [number, number] | null,
  setTempPin: (pin: [number, number] | null) => void,
  setShowPinModal: (show: boolean) => void,
  createPinInDB: (data: CreatePinData) => Promise<boolean>,
  loadPinsFromDB: (
    bounds: MapBounds,
    zoom: number,
    forceRefresh?: boolean
  ) => void,
  getPinComments: (
    pinId: string,
    forceRefresh?: boolean
  ) => Promise<EnhancedComment[] | null>,
  setSelectedPin: (
    pin: { pinId: string; pinName: string; comments: EnhancedComment[] } | null
  ) => void,
  setShowPinDetailModal: (show: boolean) => void,
  selectedPin: {
    pinId: string;
    pinName: string;
    comments: EnhancedComment[];
  } | null
) => {
  // Debounced loading to prevent too many requests
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastTimeRef = useRef<number>(0);
  const TOAST_THROTTLE_MS = 5000;
  // Long press callback
  const onLongPress = useCallback(
    (e: React.SyntheticEvent) => {
      if (!map.current) return;
      const nativeEvent = e.nativeEvent as PointerEvent;
      const rect = map.current.getContainer().getBoundingClientRect();
      const x = nativeEvent.clientX - rect.left;
      const y = nativeEvent.clientY - rect.top;

      const lngLat = map.current.unproject([x, y]);
      console.log("Long press coordinates:", lngLat);

      setTempPin([lngLat.lng, lngLat.lat]);
      setShowPinModal(true);
    },
    [map, setTempPin, setShowPinModal]
  );

  // Create pin
  const createPin = useCallback(
    async (data: {
      pinName: string;
      comment: string;
      photo?: File;
      photoMetadata?: {
        file_size: number;
        width?: number;
        height?: number;
        format: string;
      };
    }) => {
      if (!tempPin) {
        console.error("Temp pin not found");
        return;
      }

      try {
        console.log("Creating pin:", data, "Location:", tempPin);

        const createPinData: CreatePinData = {
          lat: tempPin[1],
          lng: tempPin[0],
          pinName: data.pinName,
          comment: data.comment,
          photo: data.photo,
          photoMetadata: data.photoMetadata,
        };

        const success = await createPinInDB(createPinData);

        if (success) {
          console.log("Pin created successfully");
          setShowPinModal(false);
          setTempPin(null);
          loadPinsFromMapWithCache(true);
          console.log("Pin ve ilk yorum başarıyla oluşturuldu!");
        } else {
          console.error("Pin oluşturma başarısız");
        }
      } catch (error) {
        console.error("Pin oluşturma hatası:", error);
      }
    },
    [tempPin, createPinInDB, setShowPinModal, setTempPin]
  );

  // Load pins from map with cache
  const loadPinsFromMapWithCache = useCallback(
    (forceRefresh = false) => {
      if (!map.current) return;

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      const delay = forceRefresh ? 0 : 300;

      loadingTimeoutRef.current = setTimeout(() => {
        if (!map.current) return;

        const bounds = map.current.getBounds();
        const zoom = Math.floor(map.current.getZoom());
        const MIN_ZOOM_LEVEL = 12;

        if (zoom < MIN_ZOOM_LEVEL && !forceRefresh) {
          console.log(
            `Zoom level ${zoom} is below minimum ${MIN_ZOOM_LEVEL}, skipping pin fetch`
          );

          const now = Date.now();
          if (now - lastToastTimeRef.current > TOAST_THROTTLE_MS) {
            toast.info("Zoom in closer to see pins", {
              description: `Zoom to level ${MIN_ZOOM_LEVEL} or higher to load pins`,
              duration: 3000,
            });
            lastToastTimeRef.current = now;
          }
          return;
        }

        const latDiff = bounds.getNorth() - bounds.getSouth();
        const lngDiff = bounds.getEast() - bounds.getWest();
        const expansion = 0.2;

        const mapBounds: MapBounds = {
          minLat: bounds.getSouth() - latDiff * expansion,
          maxLat: bounds.getNorth() + latDiff * expansion,
          minLng: bounds.getWest() - lngDiff * expansion,
          maxLng: bounds.getEast() + lngDiff * expansion,
        };

        console.log("Loading pins for bounds:", mapBounds, "zoom:", zoom);
        loadPinsFromDB(mapBounds, zoom, forceRefresh);
      }, delay);
    },
    [map, loadPinsFromDB]
  );

  // Refresh pins
  const refreshPins = useCallback(() => {
    loadPinsFromMapWithCache(true);
  }, [loadPinsFromMapWithCache]);

  // Clear map pins
  const clearMapPins = useCallback(() => {
    if (!map.current) return;

    const markers = document.querySelectorAll(".pin-marker");
    markers.forEach((marker) => {
      const parent = marker.closest(".maplibregl-marker");
      if (parent) {
        parent.remove();
      }
    });
  }, [map]);

  // Show pin popup
  const showPinPopup = useCallback(
    async (pin: Pin) => {
      if (!map.current) return;
      // remove all popups
      const popups = document.querySelectorAll(".maplibregl-popup");
      popups.forEach((popup) => popup.remove());

      const [lng, lat] = parseLocation(pin.location);
      const popupContent = generatePinPopupHTML(pin);

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "350px",
        className: "custom-popup",
      })
        .setLngLat([lng, lat])
        .setHTML(popupContent)
        .addTo(map.current);

      setTimeout(() => {
        const popupElement = document.getElementById("pin-popup");
        if (popupElement) {
          popupElement.addEventListener("click", async (e) => {
            e.stopPropagation();

            const comments = await getPinComments(pin.id);

            if (comments) {
              if (comments.length === 0) {
                popup.remove();
                return;
              }

              setSelectedPin({
                pinId: pin.id,
                pinName: pin.name,
                comments,
              });
              console.log("Showing pin popup:", selectedPin);

              setShowPinDetailModal(true);
              popup.remove();
            }
          });
        }
      }, 100);

      const handleMapClick = () => {
        popup.remove();
        map.current?.off("click", handleMapClick);
      };

      map.current.on("click", handleMapClick);
    },
    [map, getPinComments, setSelectedPin, setShowPinDetailModal]
  );

  // Add pin to map
  const addPinToMap = useCallback(
    (pin: Pin) => {
      console.log("Adding pin to map:", pin.name);
      if (!map.current) return;

      const [lng, lat] = parseLocation(pin.location);

      const pinElement = document.createElement("div");
      pinElement.className = "pin-marker";
      pinElement.innerHTML = generatePinElementHTML(pin);

      new maplibregl.Marker({
        element: pinElement,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(map.current);

      pinElement.addEventListener("click", (e) => {
        e.stopPropagation();
        showPinPopup(pin);
      });
    },
    [map, showPinPopup]
  );

  // Add pins to map
  const addPinsToMap = useCallback(
    (pins: Pin[]) => {
      console.log("Adding pins to map:", pins.length);
      if (!map.current) return;

      clearMapPins();
      pins.forEach((pin) => {
        addPinToMap(pin);
      });
    },
    [map, clearMapPins, addPinToMap]
  );

  return {
    onLongPress,
    createPin,
    loadPinsFromMapWithCache,
    refreshPins,
    clearMapPins,
    showPinPopup,
    addPinToMap,
    addPinsToMap,
    loadingTimeoutRef,
  };
};
