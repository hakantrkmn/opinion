import { generateUserMarkerHTML } from "@/components/map/UserMarker";
import { locationService } from "@/services/locationService";
import type {
  EnhancedComment,
  LocationPermissionState,
  SelectedPin,
} from "@/types";
import { mapStyles } from "@/utils/variables";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSession } from "./useSession";
import { useUserProfile } from "./useUserProfile";

export const useMapCore = (initialCoordinates?: [number, number] | null) => {
  // Session and profile
  const { session, user: userSession } = useSession();
  const { profile } = useUserProfile();

  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);

  // Map state
  const [currentStyle, setCurrentStyle] = useState("voyager");
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [locationPermission, setLocationPermission] =
    useState<LocationPermissionState>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  // Pin modal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [tempPin, setTempPin] = useState<[number, number] | null>(null);
  const [showPinDetailModal, setShowPinDetailModal] = useState(false);
  const [selectedPin, setSelectedPin] = useState<SelectedPin>(null);

  // Loading states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Batch comments state
  const [batchComments, setBatchComments] = useState<{
    [pinId: string]: EnhancedComment[];
  }>({});

  // Update user when session changes
  useEffect(() => {
    if (userSession) {
      const user = {
        id: userSession.id,
        email: userSession.email || "",
      };
      setUser(user);
    }
  }, [userSession]);

  // Add user marker
  const addUserMarker = useCallback(
    (lng: number, lat: number) => {
      if (!map.current) return;

      if (userMarker.current) {
        userMarker.current.remove();
      }

      const markerElement = document.createElement("div");
      markerElement.className = "user-marker";
      const generatedHTML = generateUserMarkerHTML(
        profile?.avatar_url,
        profile?.display_name
      );

      markerElement.innerHTML = generatedHTML;

      userMarker.current = new maplibregl.Marker({
        element: markerElement,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(map.current);
    },
    [map, userMarker, profile]
  );

  // Get user location
  const getUserLocation = async () => {
    const result = await locationService.requestLocation(true);

    if (result.success && result.coordinates) {
      toast.success("Location found!", {
        description:
          "You can now use the location button to navigate to your position",
      });
    }
  };

  // Go to user location
  const goToUserLocation = useCallback(() => {
    if (map.current && userLocation) {
      map.current.flyTo({
        center: userLocation,
        zoom: 16,
        duration: 1000,
      });
    }
  }, [map, userLocation]);

  // Change map style
  const changeMapStyle = useCallback(
    (
      styleName: string,
      loadPinsCallback?: (forceRefresh?: boolean) => void
    ) => {
      if (!map.current) return;

      const style = mapStyles[styleName as keyof typeof mapStyles];
      const currentCenter = map.current.getCenter();
      const currentZoom = map.current.getZoom();
      localStorage.setItem("mapStyle", styleName);

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
          loadPinsCallback?.();
        }
      });

      setCurrentStyle(styleName);
    },
    [map, setCurrentStyle, userLocation, addUserMarker]
  );

  // Initialize map
  const initializeMap = useCallback(
    (loadPinsCallback?: (forceRefresh?: boolean) => void) => {
      console.log("initializeMap");

      if (!mapContainer.current) return;

      const defaultCenter: [number, number] = initialCoordinates || [
        29.0322, 41.0082,
      ];
      const defaultZoom = initialCoordinates ? 16 : 10;

      console.log("Map initializing with:", {
        center: defaultCenter,
        zoom: defaultZoom,
        fromURL: !!initialCoordinates,
      });

      const mapStyle = localStorage.getItem("mapStyle") || "voyager";
      map.current = new maplibregl.Map({
        container: mapContainer.current!,
        style: {
          version: 8,
          sources: {
            cartodb: {
              type: "raster",
              tiles: mapStyles[mapStyle as keyof typeof mapStyles].tiles,
              tileSize: 256,
              attribution:
                mapStyles[mapStyle as keyof typeof mapStyles].attribution,
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
        if (map.current) {
          setCurrentZoom(map.current.getZoom());
        }

        if (initialCoordinates) {
          toast.success("Map navigated to coordinates", {
            description: `Latitude: ${initialCoordinates[1]}, Longitude: ${initialCoordinates[0]}`,
            duration: 4000,
          });
        }

        loadPinsCallback?.();
      });

      map.current.on("moveend", () => {
        loadPinsCallback?.();
      });

      map.current.on("zoomend", () => {
        if (map.current) {
          setCurrentZoom(map.current.getZoom());
        }
        loadPinsCallback?.();
      });
    },
    [map, mapContainer, initialCoordinates, setCurrentZoom]
  );

  // Initialize location service
  useEffect(() => {
    locationService.setCallbacks({
      onLocationUpdate: (coordinates) => {
        setUserLocation(coordinates);
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

    locationService.initialize();
  }, [setUserLocation, setLocationPermission, map, addUserMarker]);

  return {
    // Refs
    mapContainer,
    map,
    userMarker,

    // Map state
    currentStyle,
    setCurrentStyle,
    currentZoom,
    setCurrentZoom,
    locationPermission,
    setLocationPermission,
    userLocation,
    setUserLocation,
    user,

    // Pin modal state
    showPinModal,
    setShowPinModal,
    tempPin,
    setTempPin,
    showPinDetailModal,
    setShowPinDetailModal,
    selectedPin,
    setSelectedPin,

    // Loading states
    isRefreshing,
    setIsRefreshing,
    commentsLoading,
    setCommentsLoading,

    // Batch comments
    batchComments,
    setBatchComments,

    // Profile
    profile,

    // Map actions
    addUserMarker,
    getUserLocation,
    goToUserLocation,
    changeMapStyle,
    initializeMap,

    // Session data
    session,
    getUser: userSession,
  };
};
