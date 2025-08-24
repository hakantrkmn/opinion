import type { Comment, CreatePinData, MapBounds, Pin } from "@/types";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { LongPressEventType, useLongPress } from "use-long-press";
import { usePins } from "./usePins";

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
    comments: Comment[];
  } | null>(null);

  // Pin hook'unu kullan
  const {
    pins,
    loading: pinsLoading,
    createPin: createPinInDB,
    getPinComments,
    addComment,
    loadPins: loadPinsFromDB,
  } = usePins();

  // Debug için pins state'ini izle
  useEffect(() => {
    console.log("Pins state changed:", pins);
  }, [pins]);

  // Harita stilleri
  const mapStyles = {
    light: {
      tiles: [
        "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-b.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-c.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-d.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
      ],
      attribution: "© CartoDB Light",
    },
    dark: {
      tiles: [
        "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-b.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-c.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-d.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png",
      ],
      attribution: "© CartoDB Dark",
    },
    voyager: {
      tiles: [
        "https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-b.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-c.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://cartodb-basemaps-d.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      attribution: "© CartoDB Voyager",
    },
  };

  // PostGIS location'dan koordinatları çıkar (GeoJSON formatı)
  const parseLocation = (location: any): [number, number] => {
    if (!location) {
      console.warn("Invalid location:", location);
      return [0, 0];
    }

    // GeoJSON formatı kontrol et
    if (location.type === "Point" && location.coordinates) {
      const [lng, lat] = location.coordinates;
      console.log("Parsed coordinates:", [lng, lat]); // Debug için
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

  // Uzun basma callback'i
  const onLongPress = (e: any) => {
    if (!map.current) return;

    // Mouse event'inden koordinatları al
    const rect = map.current.getContainer().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
            loadPinsFromMap();
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
    if (!tempPin) return;

    try {
      const createPinData: CreatePinData = {
        lat: tempPin[1],
        lng: tempPin[0],
        pinName: data.pinName, // name yerine pinName kullan
        comment: data.comment,
      };

      const success = await createPinInDB(createPinData);

      if (success) {
        setShowPinModal(false);
        setTempPin(null);
        // Haritayı yenile
        loadPinsFromMap();
      }
    } catch (error) {
      console.error("Pin oluşturma hatası:", error);
    }
  };

  // Haritadan pin'leri yükle
  const loadPinsFromMap = async () => {
    if (!map.current) return;

    const bounds = map.current.getBounds();
    const mapBounds: MapBounds = {
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    };

    // Pin'leri DB'den yükle
    await loadPinsFromDB(mapBounds);

    // Haritadaki pin'leri temizle ve yeniden ekle
    clearMapPins();
    addPinsToMap();
  };

  // Haritadaki pin'leri temizle
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

  // Pin'leri haritaya ekle
  const addPinsToMap = () => {
    console.log("Current pins state:", pins); // Debug için
    console.log("Pins length:", pins.length); // Debug için
    pins.forEach((pin) => {
      console.log("Adding pin:", pin.name, pin.location);
      addPinToMap(pin);
    });
  };

  // Pin'i haritaya ekleme
  const addPinToMap = (pin: Pin) => {
    if (!map.current) return;

    // PostGIS location'dan koordinatları çıkar
    const [lng, lat] = parseLocation(pin.location);

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

    const marker = new maplibregl.Marker({
      element: pinElement,
      anchor: "bottom",
    })
      .setLngLat([lng, lat]) // parseLocation'dan gelen koordinatları kullan
      .addTo(map.current);

    // Pin'e tıklama olayı
    pinElement.addEventListener("click", (e) => {
      e.stopPropagation();
      showPinPopup(pin);
    });
  };

  // Pin popup'ı gösterme
  const showPinPopup = async (pin: Pin) => {
    if (!map.current) return;

    // PostGIS location'dan koordinatları çıkar
    const [lng, lat] = parseLocation(pin.location);

    const popupContent = `
      <div class="p-4 max-w-sm cursor-pointer hover:bg-gray-50 transition-colors" id="pin-popup">
        <div class="mb-3">
          <h3 class="text-xl font-bold text-gray-800 leading-tight">
            ${pin.name}
          </h3>
        </div>
        <div class="mb-3">
          <p class="text-sm text-gray-600">
            Oluşturan: <span class="font-medium">${
              pin.user?.display_name || "Anonim"
            }</span>
          </p>
        </div>
        <div class="flex items-center">
          <svg class="w-4 h-4 text-gray-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
          </svg>
          <span class="text-sm text-gray-600">${
            pin.comments_count || 0
          } yorum</span>
        </div>
      </div>
    `;

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: "350px",
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

          // Yorumları DB'den getir
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
  };

  // Yorum ekleme
  const handleAddComment = async (text: string): Promise<boolean> => {
    if (!selectedPin) return false;

    try {
      const success = await addComment(selectedPin.pinId, text);
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
      console.error("Yorum ekleme hatası:", error);
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
        loadPinsFromMap();
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
    if (map.current) return;

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
        loadPinsFromMap();
      });

      // Harita hareket ettiğinde pin'leri yenile
      map.current.on("moveend", () => {
        loadPinsFromMap();
      });
    }
  };

  // Pin'ler değiştiğinde haritaya ekle
  useEffect(() => {
    if (pins.length > 0 && map.current) {
      console.log("Adding pins to map from useEffect:", pins);
      clearMapPins();
      addPinsToMap();
    }
  }, [pins]);

  // Cleanup
  useEffect(() => {
    return () => {
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
  };
};
