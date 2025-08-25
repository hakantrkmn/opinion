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

import { parseLocation } from "@/utils/mapUtils";
import { mapStyles } from "@/utils/variables";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { LongPressEventType, useLongPress } from "use-long-press";
import { usePinsWithHybridCache } from "./usePinsWithHybridCache";

export const useMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [currentStyle, setCurrentStyle] = useState("light");
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "loading" | null
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
  // State'e user ekleyelim
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

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

  // mapPins state'ini ekleyelim - pins hook'undan gelen verileri kullan

  // Pin hook'unu kullan (Hybrid Cache version)
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

  // Debug için pins state'ini izle

  // Uzun basma callback'i
  const onLongPress = (e: React.SyntheticEvent) => {
    if (!map.current) return;
    const nativeEvent = e.nativeEvent as PointerEvent;
    const rect = map.current.getContainer().getBoundingClientRect();
    const x = nativeEvent.clientX - rect.left;
    const y = nativeEvent.clientY - rect.top;

    const lngLat = map.current.unproject([x, y]);

    console.log("Long press coordinates:", lngLat); // Debug için

    setTempPin([lngLat.lng, lngLat.lat]);
    setShowPinModal(true);
  };

  // Uzun basma hook'u
  const longPressBind = useLongPress(onLongPress, {
    onCancel: () => {
      // İptal edildiğinde yapılacak işlem
    },
    threshold: 500,
    cancelOnMovement: true,
    detect: LongPressEventType.Pointer,
  });

  // Kullanıcı konumunu alma
  const getUserLocation = () => {
    setLocationPermission("loading");

    if (!navigator.geolocation) {
      setLocationPermission("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log("Konum doğruluğu:", accuracy, "metre");
        setUserLocation([longitude, latitude]);
        setLocationPermission("granted");

        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude], // Konumunuza odakla
            zoom: 16,
            duration: 2000,
          });
          addUserMarker(longitude, latitude);

          // Konum alındıktan sonra pin'leri yükle
          setTimeout(() => {
            loadPinsFromMapWithCache();
          }, 1000);
        }
      },
      (error) => {
        console.error("Konum alınamadı:", error);
        setLocationPermission("denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  // Kullanıcı bilgisini al
  // useEffect ile kullanıcı bilgisini al
  useEffect(() => {
    getUser();
  }, []);

  // Kullanıcı marker'ını ekleme
  const addUserMarker = (lng: number, lat: number) => {
    if (!map.current) return;

    if (userMarker.current) {
      userMarker.current.remove();
    }

    const markerElement = document.createElement("div");
    markerElement.className = "user-marker";
    markerElement.innerHTML = `
      <div class="relative">
        <div class="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-500"></div>
      </div>
    `;

    userMarker.current = new maplibregl.Marker({
      element: markerElement,
      anchor: "bottom",
    })
      .setLngLat([lng, lat])
      .addTo(map.current);
  };

  // Pin oluşturma (DB ile entegre)
  const createPin = async (data: { pinName: string; comment: string }) => {
    if (!tempPin) {
      console.error("Temp pin bulunamadı");
      return;
    }

    try {
      console.log("Pin oluşturuluyor:", data, "Konum:", tempPin);

      const createPinData: CreatePinData = {
        lat: tempPin[1],
        lng: tempPin[0],
        pinName: data.pinName,
        comment: data.comment,
      };

      const success = await createPinInDB(createPinData);

      if (success) {
        console.log("Pin başarıyla oluşturuldu");
        setShowPinModal(false);
        setTempPin(null);

        // Kısa bir gecikme sonrası haritayı yenile (DB'nin güncellenmesi için)
        setTimeout(() => {
          loadPinsFromMapWithCache(true); // Force refresh
        }, 500);

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

  // Yorum ekleme (optimistic hook kullanarak)
  const handleAddComment = async (text: string): Promise<boolean> => {
    if (!selectedPin) return false;

    try {
      // Optimistic hook otomatik olarak optimistic update yapacak
      const success = await addComment(selectedPin.pinId, text);

      if (success) {
        // Başarılı olursa yorumları yenile ki gerçek ID'ler gelsin
        const updatedComments = await getPinComments(selectedPin.pinId);
        if (updatedComments) {
          setSelectedPin((prev) =>
            prev ? { ...prev, comments: updatedComments } : null
          );
        }
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
        // Yorumları yenile
        const updatedComments = await getPinComments(selectedPin.pinId);
        if (updatedComments) {
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
        // Yorumları yenile
        const updatedComments = await getPinComments(selectedPin.pinId);
        if (updatedComments) {
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
        // Başarılı olursa yorumları yenile ki güncel vote sayıları gelsin
        const updatedComments = await getPinComments(selectedPin.pinId);
        if (updatedComments) {
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

  // Konuma git
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
              tiles: mapStyles.light.tiles,
              tileSize: 256,
              attribution: mapStyles.light.attribution,
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
        getUserLocation();
        // Harita yüklendiğinde pin'leri yükle
        loadPinsFromMapWithCache();
      });

      // Harita hareket ettiğinde cache'li yükleme
      map.current.on("moveend", () => {
        loadPinsFromMapWithCache();
      });

      // Harita zoom olduğunda da pin'leri yeniden yükle
      map.current.on("zoomend", () => {
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
  };
};
