import {
  generatePinElementHTML,
  generatePinPopupHTML,
} from "@/components/pin/PinMarker";
import {
  MIN_ZOOM_LEVEL,
  pinQueryKeys,
  USER_LOCATION_CIRCLE_RADIUS,
} from "@/constants";
import { useSession } from "@/hooks/useSession";
import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { pinService } from "@/lib/supabase/database";
import { locationService } from "@/services/locationService";
import type {
  CreatePinData,
  EnhancedComment,
  MapBounds,
  Pin,
  SelectedPin,
} from "@/types";
import { parseLocation } from "@/utils/mapUtils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import maplibregl from "maplibre-gl";
import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
interface UsePinOperationsProps {
  map: React.MutableRefObject<maplibregl.Map | null>;
  tempPin: [number, number] | null;
  setTempPin: (pin: [number, number] | null) => void;
  setShowPinModal: (show: boolean) => void;
  setSelectedPin: React.Dispatch<React.SetStateAction<SelectedPin>>;
  setShowPinDetailModal: (show: boolean) => void;
  selectedPin: SelectedPin;
}

export const usePinOperations = ({
  map,
  tempPin,
  setTempPin,
  setShowPinModal,
  setSelectedPin,
  setShowPinDetailModal,
  selectedPin,
}: UsePinOperationsProps) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const hybridCache = useMemo(
    () => new HybridCacheManager(queryClient),
    [queryClient]
  );

  // Debounced loading to prevent too many requests
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToastTimeRef = useRef<number>(0);
  const TOAST_THROTTLE_MS = 5000;

  // Get pins from main cache
  const { data: allPins = [] } = useQuery({
    queryKey: pinQueryKeys.all,
    queryFn: () => [] as Pin[],
    enabled: false,
  });

  // Pin creation mutation
  const createPinMutation = useMutation({
    mutationFn: async (data: CreatePinData) => {
      const { pin, error } = await pinService.createPin(
        data,
        user || undefined
      );
      if (error) throw new Error(error);
      return pin;
    },
    onSuccess: (newPin) => {
      if (newPin) {
        const pinWithCorrectCount = { ...newPin, comment_count: 1 };
        hybridCache.cachePin(pinWithCorrectCount);

        queryClient.setQueriesData(
          { queryKey: ["pins"] },
          (oldData: Pin[] | undefined) => {
            const existingPins = Array.isArray(oldData) ? oldData : [];
            return [pinWithCorrectCount, ...existingPins];
          }
        );

        queryClient.invalidateQueries({ queryKey: ["pins", "bounds"] });
        toast.success("Pin created successfully!");
      }
    },
    onError: (error) => {
      toast.error("Failed to create pin", { description: error.message });
    },
  });

  // Pin deletion mutation
  const deletePinMutation = useMutation({
    mutationFn: async (pinId: string) => {
      const { success, error } = await pinService.deletePin(
        pinId,
        user || undefined
      );
      if (error) throw new Error(error);
      return success;
    },
    onSuccess: (_, pinId) => {
      hybridCache.deletePin(pinId);
      queryClient.setQueriesData(
        { queryKey: ["pins"] },
        (oldData: Pin[] | undefined) => {
          const existingPins = Array.isArray(oldData) ? oldData : [];
          return existingPins.filter((pin) => pin.id !== pinId);
        }
      );
      toast.success("Pin deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete pin", { description: error.message });
    },
  });

  // Load pins with hybrid cache strategy
  const loadPins = useCallback(
    async (bounds: MapBounds, zoom: number, forceRefresh = false) => {
      return await hybridCache.loadPins(bounds, zoom, forceRefresh);
    },
    [hybridCache]
  );

  // Get pin comments
  const getPinComments = useCallback(
    async (
      pinId: string,
      forceRefresh = false
    ): Promise<EnhancedComment[] | null> => {
      return await hybridCache.getPinComments(pinId, forceRefresh, user);
    },
    [user, hybridCache]
  );

  // Get batch comments for multiple pins
  const getBatchComments = useCallback(
    async (
      pinIds: string[],
      forceRefresh = false
    ): Promise<{ [pinId: string]: EnhancedComment[] } | null> => {
      return await hybridCache.getBatchComments(pinIds, forceRefresh, user);
    },
    [user, hybridCache]
  );

  // Long press callback
  const onLongPress = useCallback(
    async (e: React.SyntheticEvent) => {
      if (!map.current) return;
      const nativeEvent = e.nativeEvent as PointerEvent;
      const rect = map.current.getContainer().getBoundingClientRect();
      const x = nativeEvent.clientX - rect.left;
      const y = nativeEvent.clientY - rect.top;

      const lngLat = map.current.unproject([x, y]);

      const permissionState = await locationService.getPermissionState();
      console.log("Location permission state:", permissionState);

      if (permissionState === "granted") {
        console.log("Location permission is granted");

        // Check if the pin location is within the 50-meter circle
        const isInCircle = await locationService.isLocationInCircle(
          lngLat.lat,
          lngLat.lng
        );
        console.log("Pin location in circle:", isInCircle);

        if (isInCircle === null) {
          toast.error("User location not available");
          return;
        }

        if (isInCircle) {
          setTempPin([lngLat.lng, lngLat.lat]);
          setShowPinModal(true);
        } else {
          toast.error(
            `Pin must be within ${USER_LOCATION_CIRCLE_RADIUS} meters of your location`,
            {
              description:
                "Please move closer to your location or choose a different spot",
            }
          );
        }
      } else {
        toast.error("Location permission is not granted");
      }
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
        const createPinData: CreatePinData = {
          lat: tempPin[1],
          lng: tempPin[0],
          pinName: data.pinName,
          comment: data.comment,
          photo: data.photo,
          photoMetadata: data.photoMetadata,
        };

        await createPinMutation.mutateAsync(createPinData);
        setShowPinModal(false);
        setTempPin(null);
        loadPinsFromMapWithCache(true);
        console.log("Pin ve ilk yorum başarıyla oluşturuldu!");
      } catch (error) {
        console.error("Pin oluşturma hatası:", error);
      }
    },
    [tempPin, createPinMutation, setShowPinModal, setTempPin]
  );

  // Load pins from map with cache
  const loadPinsFromMapWithCache = useCallback(
    (forceRefresh = false) => {
      if (!map.current) return;

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      const delay = forceRefresh ? 0 : 300;

      loadingTimeoutRef.current = setTimeout(async () => {
        if (!map.current) return;

        const bounds = map.current.getBounds();
        const zoom = Math.floor(map.current.getZoom());

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
        await loadPins(mapBounds, zoom, forceRefresh);
      }, delay);
    },
    [map, loadPins]
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
    // State
    pins: allPins,
    loading: createPinMutation.isPending || deletePinMutation.isPending,

    // Pin operations
    onLongPress,
    createPin,
    createPinFromData: async (data: CreatePinData) => {
      try {
        await createPinMutation.mutateAsync(data);
        return true;
      } catch {
        return false;
      }
    },
    deletePin: async (pinId: string) => {
      try {
        await deletePinMutation.mutateAsync(pinId);
        return true;
      } catch {
        return false;
      }
    },
    loadPins,
    loadPinsFromMapWithCache,
    refreshPins,
    clearMapPins,
    showPinPopup,
    addPinToMap,
    addPinsToMap,

    // Comments
    getPinComments,
    getBatchComments,

    // Cache management
    invalidateCache: () => {
      queryClient.invalidateQueries({ queryKey: ["pins"] });
    },

    // Refs and helpers
    loadingTimeoutRef,
  };
};
