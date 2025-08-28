import {
  generatePinElementHTML,
  generatePinPopupHTML,
} from "@/components/PinMarker";
import { createClient } from "@/lib/supabase/client";
import {
  locationService,
  type LocationPermissionState,
} from "@/services/locationService";
import type {
  Comment,
  CreatePinData,
  EnhancedComment,
  MapBounds,
  Pin,
} from "@/types";

import { generateUserMarkerHTML } from "@/components/UserMarker";
import { useUserProfile } from "@/hooks/useUserProfile";
import { parseLocation } from "@/utils/mapUtils";
import { mapStyles } from "@/utils/variables";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LongPressEventType, useLongPress } from "use-long-press";
import { usePinsWithHybridCache } from "./usePinsWithHybridCache";

export const useMap = (initialCoordinates?: [number, number] | null) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [currentStyle, setCurrentStyle] = useState("voyager");
  const [locationPermission, setLocationPermission] =
    useState<LocationPermissionState>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [tempPin, setTempPin] = useState<[number, number] | null>(null);
  const [showPinDetailModal, setShowPinDetailModal] = useState(false);
  const [selectedPin, setSelectedPin] = useState<{
    pinId: string;
    pinName: string;
    comments: (Comment | EnhancedComment)[];
  } | null>(null);
  // Add user to state
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  // State for zoom level
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  // State for batch loaded comments
  const [batchComments, setBatchComments] = useState<{
    [pinId: string]: Comment[];
  }>({});
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Get user profile data including avatar
  const { profile } = useUserProfile();

  // Recreate user marker when profile changes (to update avatar)
  useEffect(() => {
    if (userLocation && profile) {
      console.log("Profile changed, updating user marker:", {
        avatarUrl: profile.avatar_url,
        displayName: profile.display_name,
        userLocation,
      });
      addUserMarker(userLocation[0], userLocation[1]);
    }
  }, [profile?.avatar_url, profile?.display_name, userLocation]);

  const getUser = async () => {
    const supabase = createClient();
    const {
      data: { session: sessionData },
    } = await supabase.auth.getSession();
    if (sessionData?.user) {
      setUser({
        id: sessionData.user.id,
        email: sessionData.user.email || "",
      });
    } else {
      setUser(null);
    }
  };

  // Add mapPins state - use data from pins hook

  // Use pin hook (Hybrid Cache version)
  const {
    pins,
    loading: pinsLoading,
    createPin: createPinInDB,
    getPinComments,
    getBatchComments,
    addComment,
    loadPins: loadPinsFromDB,
    editComment,
    deleteComment,
    voteComment,
    hasUserCommented,
    invalidateCache, // Add cache invalidation function
  } = usePinsWithHybridCache();
  const mapPins = pins;

  // Watch pins state for debugging

  // Long press callback
  const onLongPress = (e: React.SyntheticEvent) => {
    if (!map.current) return;
    const nativeEvent = e.nativeEvent as PointerEvent;
    const rect = map.current.getContainer().getBoundingClientRect();
    const x = nativeEvent.clientX - rect.left;
    const y = nativeEvent.clientY - rect.top;

    const lngLat = map.current.unproject([x, y]);

    console.log("Long press coordinates:", lngLat); // For debugging

    setTempPin([lngLat.lng, lngLat.lat]);
    setShowPinModal(true);
  };

  // Long press hook
  const longPressBind = useLongPress(onLongPress, {
    onCancel: () => {
      // Action to take when cancelled
    },
    threshold: 500,
    cancelOnMovement: true,
    detect: LongPressEventType.Pointer,
  });

  // Initialize location service
  useEffect(() => {
    // Set up location service callbacks
    locationService.setCallbacks({
      onLocationUpdate: (coordinates) => {
        setUserLocation(coordinates);
        // Remove automatic navigation - only update state
        // User must click the location button to navigate
        if (map.current) {
          addUserMarker(coordinates[0], coordinates[1]);
        }
      },
      onPermissionChange: (state) => {
        setLocationPermission(state);
      },
      onError: (error) => {
        console.error("Location service error:", error);
      },
    });

    // Initialize location service (this will check permissions and optionally request location)
    locationService.initialize();
  }, []);

  // Get user location - now uses the service
  const getUserLocation = async () => {
    const result = await locationService.requestLocation(true);

    // Show success toast when location is obtained
    if (result.success && result.coordinates) {
      // Calculate a rough accuracy estimate (location service doesn't expose this)
      toast.success("Location found!", {
        description:
          "You can now use the location button to navigate to your position",
      });
    }
  };

  // Get user information with useEffect
  useEffect(() => {
    getUser();
  }, []);

  // Load comments for all visible pins using batch loading
  const loadVisiblePinsComments = useCallback(
    async (pinList?: Pin[]) => {
      const pinsToLoad = pinList || mapPins;

      if (pinsToLoad.length === 0) {
        setBatchComments({});
        return;
      }

      // Check if getBatchComments is available
      if (!getBatchComments) {
        console.warn("getBatchComments not available, skipping batch loading");
        return;
      }

      setCommentsLoading(true);

      try {
        console.log(
          "🔄 Loading comments for",
          pinsToLoad.length,
          "visible pins using batch loading"
        );

        const pinIds = pinsToLoad.map((pin) => pin.id);
        const comments = await getBatchComments(pinIds);

        if (comments) {
          setBatchComments(comments);
          console.log(
            "✅ Batch comments loaded successfully for",
            Object.keys(comments).length,
            "pins"
          );
        }
      } catch (error) {
        console.error("❌ Failed to load batch comments:", error);
      } finally {
        setCommentsLoading(false);
      }
    },
    [mapPins, getBatchComments]
  );

  // Auto-load comments when pins change
  useEffect(() => {
    if (mapPins.length > 0 && !commentsLoading) {
      // Debounce the comment loading to avoid too frequent calls
      const timeoutId = setTimeout(async () => {
        console.log(
          "🎆 Auto-loading batch comments for",
          mapPins.length,
          "visible pins"
        );
        const startTime = performance.now();

        try {
          await loadVisiblePinsComments();
          const endTime = performance.now();
          const duration = endTime - startTime;
          console.log(
            "✅ Batch comment loading completed in",
            duration.toFixed(2),
            "ms"
          );

          // Log performance improvement estimate
          const individualEstimate = mapPins.length * 50; // Assume 50ms per individual request
          const improvement = (
            ((individualEstimate - duration) / individualEstimate) *
            100
          ).toFixed(1);
          console.log(
            "📊 Performance improvement: ~" +
              improvement +
              "% faster than individual loading"
          );
        } catch (error) {
          console.error("❌ Error in batch comment loading:", error);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [mapPins, loadVisiblePinsComments, getBatchComments, commentsLoading]);

  // Add user marker
  const addUserMarker = (lng: number, lat: number) => {
    if (!map.current) return;

    if (userMarker.current) {
      userMarker.current.remove();
    }

    // Debug avatar data
    console.log("UserMarker Debug:", {
      avatarUrl: profile?.avatar_url,
      displayName: profile?.display_name,
      hasProfile: !!profile,
      avatarUrlValid: profile?.avatar_url
        ? profile.avatar_url.includes("supabase")
        : false,
    });

    const markerElement = document.createElement("div");
    markerElement.className = "user-marker";
    const generatedHTML = generateUserMarkerHTML(
      profile?.avatar_url,
      profile?.display_name
    );

    console.log(
      "Generated UserMarker HTML:",
      generatedHTML.substring(0, 200) + "..."
    );
    markerElement.innerHTML = generatedHTML;

    userMarker.current = new maplibregl.Marker({
      element: markerElement,
      anchor: "bottom",
    })
      .setLngLat([lng, lat])
      .addTo(map.current);

    console.log("UserMarker added to map at:", [lng, lat]);
  };

  // Create pin (integrated with DB)
  const createPin = async (data: { 
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

        // Immediately force refresh to show the new pin with correct comment count
        loadPinsFromMapWithCache(true); // Force refresh

        // Başarı mesajı gösterilebilir
        console.log("Pin ve ilk yorum başarıyla oluşturuldu!");
      } else {
        console.error("Pin oluşturma başarısız");
      }
    } catch (error) {
      console.error("Pin oluşturma hatası:", error);
      // Hata mesajı kullanıcıya gösterilebilir
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounced loading to prevent too many requests
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Toast throttling to prevent spam
  const lastToastTimeRef = useRef<number>(0);
  const TOAST_THROTTLE_MS = 5000; // 5 seconds between toasts

  // Cache'li pin yükleme (TanStack Query otomatik olarak cache'i yönetiyor)
  const loadPinsFromMapWithCache = useCallback(
    (forceRefresh = false) => {
      if (!map.current) return;

      // Clear existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Debounce loading by 300ms unless force refresh
      const delay = forceRefresh ? 0 : 300;

      loadingTimeoutRef.current = setTimeout(() => {
        if (!map.current) return;

        const bounds = map.current.getBounds();
        const zoom = Math.floor(map.current.getZoom());

        // Minimum zoom level check (same as refresh button)
        const MIN_ZOOM_LEVEL = 12;

        if (zoom < MIN_ZOOM_LEVEL && !forceRefresh) {
          console.log(
            `Zoom level ${zoom} is below minimum ${MIN_ZOOM_LEVEL}, skipping pin fetch`
          );

          // Show informative toast (throttled to prevent spam)
          const now = Date.now();
          if (now - lastToastTimeRef.current > TOAST_THROTTLE_MS) {
            toast.info("Zoom in closer to see pins", {
              description: `Zoom to level ${MIN_ZOOM_LEVEL} or higher to load pins`,
              duration: 3000,
            });
            lastToastTimeRef.current = now;
          }

          setIsRefreshing(false);
          return;
        }

        // Expand bounds by 20% to preload nearby pins
        const latDiff = bounds.getNorth() - bounds.getSouth();
        const lngDiff = bounds.getEast() - bounds.getWest();
        const expansion = 0.2; // 20% expansion

        const mapBounds: MapBounds = {
          minLat: bounds.getSouth() - latDiff * expansion,
          maxLat: bounds.getNorth() + latDiff * expansion,
          minLng: bounds.getWest() - lngDiff * expansion,
          maxLng: bounds.getEast() + lngDiff * expansion,
        };

        console.log("Loading pins for bounds:", mapBounds, "zoom:", zoom);
        setIsRefreshing(true);

        // Hybrid cache ile pin'leri yükle
        loadPinsFromDB(mapBounds, zoom, forceRefresh);

        // Loading state will be managed by the query
        setTimeout(() => setIsRefreshing(false), 1000);
      }, delay);
    },
    [loadPinsFromDB]
  );

  // Refresh fonksiyonu
  const refreshPins = useCallback(() => {
    loadPinsFromMapWithCache(true);
  }, [loadPinsFromMapWithCache]);

  // Invalidate pin comments cache function
  const invalidatePinCommentsCache = useCallback(
    async (pinId: string) => {
      try {
        // Invalidate React Query caches
        invalidateCache();

        // Also clear the batch comments for this pin to force refresh
        setBatchComments((prev) => {
          const updated = { ...prev };
          delete updated[pinId];
          return updated;
        });

        console.log("✅ Pin comments cache invalidated for pin:", pinId);
      } catch (error) {
        console.error("❌ Failed to invalidate pin comments cache:", error);
      }
    },
    [invalidateCache, setBatchComments]
  );

  // Haritadan pin'leri temizle
  const clearMapPins = () => {
    if (!map.current) return;

    // Tüm pin marker'larını kaldır
    const markers = document.querySelectorAll(".pin-marker");
    markers.forEach((marker) => {
      const parent = marker.closest(".maplibregl-marker");
      if (parent) {
        parent.remove();
      }
    });
  };

  // Pin popup'ı gösterme
  const showPinPopup = useCallback(
    async (pin: Pin) => {
      if (!map.current) return;

      // PostGIS location'dan koordinatları çıkar
      const [lng, lat] = parseLocation(pin.location);

      // Pin popup content - component kullanarak oluştur
      const popupContent = generatePinPopupHTML(pin);

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "350px",
        className: "custom-popup",
      })
        .setLngLat([lng, lat]) // parseLocation'dan gelen koordinatları kullan
        .setHTML(popupContent)
        .addTo(map.current);

      // Popup'a tıklama olayı
      setTimeout(() => {
        const popupElement = document.getElementById("pin-popup");
        if (popupElement) {
          popupElement.addEventListener("click", async (e) => {
            e.stopPropagation();

            // Modal açılırken DB sorgusu yap (şimdilik basit tutalım)
            const comments = await getPinComments(pin.id);

            if (comments) {
              // Check if comments array is empty (could be auto-deleted pin)
              if (comments.length === 0) {
                // Pin was auto-deleted, just close popup
                popup.remove();
                return;
              }

              setSelectedPin({
                pinId: pin.id,
                pinName: pin.name,
                comments,
              });
              setShowPinDetailModal(true);
              popup.remove();
            }
          });
        }
      }, 100);

      // Haritaya tıklayınca popup'ı kapat
      const handleMapClick = () => {
        popup.remove();
        map.current?.off("click", handleMapClick);
      };

      map.current.on("click", handleMapClick);
    },
    [getPinComments]
  );

  // Pin'i haritaya ekleme
  const addPinToMap = useCallback(
    (pin: Pin) => {
      if (!map.current) return;

      // PostGIS location'dan koordinatları çıkar
      const [lng, lat] = parseLocation(pin.location);

      // Pin elementini oluştur (component kullanarak)
      const pinElement = document.createElement("div");
      pinElement.className = "pin-marker";
      pinElement.innerHTML = generatePinElementHTML(pin);

      new maplibregl.Marker({
        element: pinElement,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(map.current);

      // Pin'e tıklama olayı
      pinElement.addEventListener("click", (e) => {
        e.stopPropagation();
        showPinPopup(pin);
      });
    },
    [showPinPopup]
  );

  // Pin'e tıklama handler'ı (batch comments kullanarak)
  const handlePinClick = useCallback(
    async (pin: Pin) => {
      try {
        console.log("Pin clicked:", pin.name);

        // First try to get comments from batch-loaded cache
        let commentsToShow = batchComments[pin.id] || [];

        // If no batch comments available, load individually
        if (commentsToShow.length === 0 && getPinComments) {
          console.log(
            "No batch comments available, loading individually for pin:",
            pin.id
          );
          const individualComments = await getPinComments(pin.id);
          commentsToShow = individualComments || [];
        } else if (commentsToShow.length > 0) {
          console.log(
            "Using batch-loaded comments for pin:",
            pin.id,
            commentsToShow.length,
            "comments"
          );
        }

        setSelectedPin({
          pinId: pin.id,
          pinName: pin.name,
          comments: commentsToShow,
        });
        setShowPinDetailModal(true);
      } catch (error) {
        console.error("Error in handlePinClick:", error);
        // Still open the modal even if comment loading fails
        setSelectedPin({
          pinId: pin.id,
          pinName: pin.name,
          comments: [],
        });
        setShowPinDetailModal(true);
      }
    },
    [getPinComments, batchComments]
  );

  // Pin'leri haritaya ekle
  const addPinsToMap = useCallback(() => {
    if (!map.current) return;

    // Önceki pin'leri temizle
    clearMapPins();

    // Yeni pin'leri ekle
    pins.forEach((pin) => {
      addPinToMap(pin);
    });
  }, [addPinToMap, pins]);

  // Yorum ekleme (cache ile entegre)
  const handleAddComment = async (
    text: string,
    photoUrl?: string,
    photoMetadata?: Record<string, unknown>
  ): Promise<boolean> => {
    if (!selectedPin) return false;

    try {
      // Yorum ekle - photo parameters'ı geç
      const success = await addComment(
        selectedPin.pinId,
        text,
        photoUrl,
        photoMetadata
      );

      if (success) {
        // Yorumları hemen yenile ki modalda görünsün - fresh data al
        const updatedComments = await getPinComments(selectedPin.pinId, true); // Force refresh
        if (updatedComments) {
          // Check if pin was auto-deleted
          if (updatedComments.length === 0) {
            // Pin was auto-deleted, close modal
            setShowPinDetailModal(false);
            setSelectedPin(null);
            return true;
          }

          setSelectedPin((prev) =>
            prev ? { ...prev, comments: updatedComments } : null
          );
        }

        // Note: Cache is already updated in usePinsWithHybridCache mutation
        // No need to refresh all pins, just the comment count is updated automatically
      }

      return success;
    } catch (error) {
      console.error("Yorum ekleme hatası:", error);
      return false;
    }
  };

  // Yorum düzenleme
  const handleEditComment = async (
    commentId: string,
    newText: string,
    photoUrl?: string | null,
    photoMetadata?: Record<string, unknown>
  ): Promise<boolean> => {
    if (!selectedPin) return false;

    try {
      const success = await editComment(
        commentId,
        newText,
        photoUrl,
        photoMetadata
      );
      if (success) {
        // Yorumları yenile - fresh data al
        const updatedComments = await getPinComments(selectedPin.pinId, true);
        if (updatedComments) {
          // Check if pin was auto-deleted
          if (updatedComments.length === 0) {
            // Pin was auto-deleted, close modal
            setShowPinDetailModal(false);
            setSelectedPin(null);
            return success;
          }

          setSelectedPin((prev) =>
            prev ? { ...prev, comments: updatedComments } : null
          );
        }
      }
      return success;
    } catch (error) {
      console.error("Yorum düzenleme hatası:", error);
      return false;
    }
  };

  // Yorum silme
  const handleDeleteComment = async (commentId: string): Promise<boolean> => {
    if (!selectedPin) return false;

    try {
      const success = await deleteComment(commentId);
      if (success) {
        // Yorumları yenile - fresh data al
        const updatedComments = await getPinComments(selectedPin.pinId, true);
        if (updatedComments) {
          // Check if pin was auto-deleted
          if (updatedComments.length === 0) {
            // Pin was auto-deleted, close modal
            setShowPinDetailModal(false);
            setSelectedPin(null);
            return success;
          }

          setSelectedPin((prev) =>
            prev ? { ...prev, comments: updatedComments } : null
          );
        }
      }
      return success;
    } catch (error) {
      console.error("Yorum silme hatası:", error);
      return false;
    }
  };

  // Yorum oylama (optimistic hook kullanarak)
  const handleVoteComment = async (
    commentId: string,
    value: number
  ): Promise<boolean> => {
    if (!selectedPin) return false;

    try {
      // Optimistic hook otomatik olarak optimistic update yapacak
      const success = await voteComment(commentId, value);

      if (success) {
        // Başarılı olursa yorumları yenile ki güncel vote sayıları gelsin - fresh data al
        const updatedComments = await getPinComments(selectedPin.pinId, true);
        if (updatedComments) {
          // Check if pin was auto-deleted
          if (updatedComments.length === 0) {
            // Pin was auto-deleted, close modal
            setShowPinDetailModal(false);
            setSelectedPin(null);
            return success;
          }

          setSelectedPin((prev) =>
            prev ? { ...prev, comments: updatedComments } : null
          );
        }
      }

      return success;
    } catch (error) {
      console.error("Yorum oylama hatası:", error);
      return false;
    }
  };

  // Harita stili değiştirme
  const changeMapStyle = (styleName: string) => {
    if (!map.current) return;

    const style = mapStyles[styleName as keyof typeof mapStyles];
    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();

    map.current.setStyle({
      version: 8,
      sources: {
        cartodb: {
          type: "raster",
          tiles: style.tiles,
          tileSize: 256,
          attribution: style.attribution,
        },
      },
      layers: [
        {
          id: "cartodb-tiles",
          type: "raster",
          source: "cartodb",
          minzoom: 0,
          maxzoom: 20,
        },
      ],
    });

    map.current.once("style.load", () => {
      if (map.current) {
        map.current.setCenter(currentCenter);
        map.current.setZoom(currentZoom);
        if (userLocation) {
          addUserMarker(userLocation[0], userLocation[1]);
        }
        // Harita stili değiştiğinde pin'leri yeniden yükle
        loadPinsFromMapWithCache();
      }
    });

    setCurrentStyle(styleName);
  };

  // Go to user location
  const goToUserLocation = () => {
    if (map.current && userLocation) {
      map.current.flyTo({
        center: userLocation,
        zoom: 16,
        duration: 1000,
      });
    }
  };

  // Harita başlatma
  const initializeMap = () => {
    console.log("initializeMap");

    if (mapContainer.current) {
      // Use initialCoordinates if provided, otherwise default to Istanbul
      const defaultCenter: [number, number] = initialCoordinates || [
        29.0322, 41.0082,
      ];
      const defaultZoom = initialCoordinates ? 16 : 10; // Zoom in closer for URL coordinates

      console.log("Map initializing with:", {
        center: defaultCenter,
        zoom: defaultZoom,
        fromURL: !!initialCoordinates,
      });

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            cartodb: {
              type: "raster",
              tiles: mapStyles.voyager.tiles,
              tileSize: 256,
              attribution: mapStyles.voyager.attribution,
            },
          },
          layers: [
            {
              id: "cartodb-tiles",
              type: "raster",
              source: "cartodb",
              minzoom: 0,
              maxzoom: 20,
            },
          ],
        },
        center: defaultCenter,
        zoom: defaultZoom,
        maxZoom: 20,
      });

      map.current.on("load", () => {
        console.log("CartoDB haritası yüklendi!");
        // İlk zoom seviyesini ayarla
        if (map.current) {
          setCurrentZoom(map.current.getZoom());
        }

        // If we have coordinates from URL, show a success message
        if (initialCoordinates) {
          toast.success("Map navigated to coordinates", {
            description: `Latitude: ${initialCoordinates[1]}, Longitude: ${initialCoordinates[0]}`,
            duration: 4000,
          });
        }

        // Harita yüklendiğinde pin'leri yükle (konum izni olmasa da)
        loadPinsFromMapWithCache();
      });

      // Harita hareket ettiğinde cache'li yükleme
      map.current.on("moveend", () => {
        loadPinsFromMapWithCache();
      });

      // Harita zoom olduğunda da pin'leri yeniden yükle ve zoom seviyesini güncelle
      map.current.on("zoomend", () => {
        if (map.current) {
          setCurrentZoom(map.current.getZoom());
        }
        loadPinsFromMapWithCache();
      });
    }
  };

  // Pin'ler artık PinMarker component'leri ile gösteriliyor
  useEffect(() => {
    if (pins.length > 0) {
      console.log("Pins loaded:", pins.length);
    }
  }, [pins]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (userMarker.current) {
        userMarker.current.remove();
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  return {
    mapContainer,
    map, // map ref'ini export edin
    currentStyle,
    locationPermission,
    userLocation,
    mapStyles,
    getUserLocation,
    changeMapStyle,
    goToUserLocation,
    initializeMap,
    showPinModal,
    createPin,
    setShowPinModal,
    longPressBind,
    showPinDetailModal,
    setShowPinDetailModal,
    selectedPin,
    setSelectedPin,
    pinsLoading,
    handleAddComment,
    handleEditComment,
    handleDeleteComment,
    handleVoteComment,
    user,
    mapPins,
    handlePinClick,
    showPinPopup, // Add showPinPopup to exports
    refreshPins,
    invalidatePinCommentsCache, // Add cache invalidation function
    isRefreshing,
    getPinComments,
    getBatchComments,
    currentZoom,
    // New batch comment loading features
    batchComments,
    setBatchComments,
    commentsLoading,
    loadVisiblePinsComments,
    hasUserCommented,
  };
};
