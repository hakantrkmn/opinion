import {
  generatePinElementHTML,
  generatePinPopupHTML,
} from "@/components/PinMarker";
import { createClient } from "@/lib/supabase/client";
import type {
  Comment,
  CreatePinData,
  EnhancedComment,
  MapBounds,
  Pin,
} from "@/types";

import { generateUserMarkerHTML } from "@/components/UserMarker";
import {
  checkGeolocationSupport,
  checkIOSPermissionState,
  getDetailedErrorMessage,
  getGeolocationWithFallback,
  getIOSGeolocation,
  getMobileInstructions,
  isHTTPS,
  isIOS,
} from "@/utils/geolocation";
import { parseLocation } from "@/utils/mapUtils";
import { mapStyles } from "@/utils/variables";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LongPressEventType, useLongPress } from "use-long-press";
import { usePinsWithHybridCache } from "./usePinsWithHybridCache";

export const useMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [currentStyle, setCurrentStyle] = useState("voyager");
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "loading" | "prompt" | null
  >(null);
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
    addComment,
    loadPins: loadPinsFromDB,
    editComment,
    deleteComment,
    voteComment,
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

  // Check initial permission state for iOS
  const checkInitialPermission = async () => {
    if (isIOS()) {
      const permissionState = await checkIOSPermissionState();
      console.log("iOS permission state:", permissionState);

      if (permissionState === "granted") {
        // Permission already granted, get location
        getUserLocation();
      } else if (permissionState === "denied") {
        // Permission denied, show denied state
        setLocationPermission("denied");
      } else {
        // Permission prompt or unknown, show prompt state
        setLocationPermission("prompt");
      }
      return;
    }

    // For non-iOS devices, try to get location immediately
    getUserLocation();
  };

  // Get user location with improved mobile support
  const getUserLocation = async () => {
    setLocationPermission("loading");

    // Check HTTPS requirement
    if (!isHTTPS()) {
      setLocationPermission("denied");
      toast.error("HTTPS Required", {
        description: "Location services require a secure connection (HTTPS)",
      });
      return;
    }

    // Check geolocation support
    if (!checkGeolocationSupport()) {
      setLocationPermission("denied");
      toast.error("Location services not supported", {
        description: "Your browser doesn't support location services",
      });
      return;
    }

    try {
      // iOS için özel geolocation fonksiyonu kullan
      const result = isIOS()
        ? await getIOSGeolocation()
        : await getGeolocationWithFallback();

      if (result.success && result.position) {
        const { latitude, longitude, accuracy } = result.position.coords;
        console.log("Location accuracy:", accuracy, "meters");
        setUserLocation([longitude, latitude]);
        setLocationPermission("granted");

        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 16,
            duration: 2000,
          });
          addUserMarker(longitude, latitude);

          // Load pins after location is obtained
          setTimeout(() => {
            loadPinsFromMapWithCache();
          }, 1000);
        }

        toast.success("Location obtained successfully", {
          description: `Accuracy: ${Math.round(accuracy)} meters`,
        });
      } else if (result.error) {
        console.error("Location could not be obtained:", {
          code: result.error.code,
          message: result.error.message,
          timestamp: new Date().toISOString(),
        });

        // iOS'ta permission denied durumunda prompt state'e geri dön
        if (isIOS() && result.error.code === result.error.PERMISSION_DENIED) {
          console.log("iOS permission denied, returning to prompt state");
          setLocationPermission("prompt");

          toast.error("Location Permission Denied", {
            description:
              "Safari blocked location access. Try again and tap 'Allow' when prompted.",
            duration: 5000,
          });
          return;
        }

        // iOS'ta timeout durumunda da prompt state'e dön
        if (isIOS() && result.error.code === result.error.TIMEOUT) {
          console.log("iOS timeout, returning to prompt state");
          setLocationPermission("prompt");

          toast.error("Location Request Timed Out", {
            description: "Location request took too long. Please try again.",
            duration: 5000,
          });
          return;
        }

        setLocationPermission("denied");

        const errorMessage = getDetailedErrorMessage(result.error);
        const instructions = getMobileInstructions();

        toast.error("Location unavailable", {
          description: errorMessage,
        });

        // Show mobile-specific instructions
        setTimeout(() => {
          toast.info("Mobile device instructions", {
            description: instructions.join(" • "),
            duration: 8000,
          });
        }, 2000);

        // Fallback to Istanbul for position unavailable errors
        if (
          result.error.code === result.error.POSITION_UNAVAILABLE &&
          map.current
        ) {
          map.current.flyTo({
            center: [29.0322, 41.0082], // Istanbul coordinates
            zoom: 10,
            duration: 2000,
          });
          // Load pins
          setTimeout(() => {
            loadPinsFromMapWithCache();
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Unexpected geolocation error:", error);

      // iOS'ta unexpected error durumunda da prompt state'e dön
      if (isIOS()) {
        setLocationPermission("prompt");
        toast.error("Location request failed", {
          description: "Please try again by tapping 'Allow Location Access'",
        });
      } else {
        setLocationPermission("denied");
        toast.error("Unexpected error", {
          description: "An error occurred while getting location",
        });
      }
    }
  };

  // Get user information
  // Get user information with useEffect
  useEffect(() => {
    getUser();
  }, []);

  // Add user marker
  const addUserMarker = (lng: number, lat: number) => {
    if (!map.current) return;

    if (userMarker.current) {
      userMarker.current.remove();
    }

    const markerElement = document.createElement("div");
    markerElement.className = "user-marker";
    markerElement.innerHTML = generateUserMarkerHTML();

    userMarker.current = new maplibregl.Marker({
      element: markerElement,
      anchor: "bottom",
    })
      .setLngLat([lng, lat])
      .addTo(map.current);
  };

  // Create pin (integrated with DB)
  const createPin = async (data: { pinName: string; comment: string }) => {
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

  // Pin'e tıklama handler'ı
  const handlePinClick = (pin: Pin) => {
    showPinPopup(pin);
  };

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
  const handleAddComment = async (text: string): Promise<boolean> => {
    if (!selectedPin) return false;

    try {
      // Yorum ekle
      const success = await addComment(selectedPin.pinId, text);

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
    newText: string
  ): Promise<boolean> => {
    if (!selectedPin) return false;

    try {
      const success = await editComment(commentId, newText);
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
        center: [29.0322, 41.0082],
        zoom: 10,
        maxZoom: 20,
      });

      map.current.on("load", () => {
        console.log("CartoDB haritası yüklendi!");
        // İlk zoom seviyesini ayarla
        if (map.current) {
          setCurrentZoom(map.current.getZoom());
        }
        checkInitialPermission();
        // Harita yüklendiğinde pin'leri yükle
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
    refreshPins,
    isRefreshing,
    getPinComments,
    currentZoom,
  };
};
