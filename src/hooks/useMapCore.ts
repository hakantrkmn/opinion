import { generateUserMarkerHTML } from "@/components/map/UserMarker";
import { locationService } from "@/services/locationService";
import type { LocationPermissionState } from "@/types";
import { mapStyles } from "@/utils/variables";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSession } from "./useSession";
import { useUserProfile } from "./useUserProfile";

export const useMapCore = (initialCoordinates?: [number, number] | null) => {
  const { user: userSession } = useSession();
  const { profile } = useUserProfile();

  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);

  // Map-only state
  const [currentStyle, setCurrentStyle] = useState("voyager");
  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [locationPermission, setLocationPermission] =
    useState<LocationPermissionState>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );

  const user = userSession
    ? { id: userSession.id, email: userSession.email || "" }
    : null;

  // User marker - zoom 13+ da görünür
  const USER_MARKER_MIN_ZOOM = 16;

  const updateUserMarkerVisibility = useCallback(() => {
    if (!userMarker.current || !map.current) return;
    const el = userMarker.current.getElement();
    const zoom = map.current.getZoom();
    el.style.display = zoom >= USER_MARKER_MIN_ZOOM ? "" : "none";
  }, []);

  const addUserMarker = useCallback(
    (lng: number, lat: number) => {
      if (!map.current) return;
      if (userMarker.current) userMarker.current.remove();

      const el = document.createElement("div");
      el.className = "user-marker";
      el.innerHTML = generateUserMarkerHTML(
        profile?.avatar_url,
        profile?.display_name
      );

      // Zoom kontrolü
      const zoom = map.current.getZoom();
      if (zoom < USER_MARKER_MIN_ZOOM) el.style.display = "none";

      userMarker.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lng, lat])
        .addTo(map.current);

      map.current.on("zoomend", updateUserMarkerVisibility);
    },
    [profile, updateUserMarkerVisibility]
  );

  const getUserLocation = async () => {
    const result = await locationService.requestLocation(true);
    if (result.success && result.coordinates) {
      toast.success("Location found!");
    }
  };

  const goToUserLocation = useCallback(() => {
    if (map.current && userLocation) {
      map.current.flyTo({ center: userLocation, zoom: 16, duration: 1000 });
    }
  }, [userLocation]);

  const changeMapStyle = useCallback(
    (styleName: string, loadPinsCallback?: (forceRefresh?: boolean) => void) => {
      if (!map.current) return;
      const style = mapStyles[styleName as keyof typeof mapStyles];
      const center = map.current.getCenter();
      const zoom = map.current.getZoom();
      localStorage.setItem("mapStyle", styleName);

      map.current.setStyle({
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          cartodb: { type: "raster", tiles: style.tiles, tileSize: 256, attribution: style.attribution },
        },
        layers: [{ id: "cartodb-tiles", type: "raster", source: "cartodb", minzoom: 0, maxzoom: 20 }],
      });

      map.current.once("style.load", () => {
        if (!map.current) return;
        map.current.setCenter(center);
        map.current.setZoom(zoom);
        if (userLocation) addUserMarker(userLocation[0], userLocation[1]);
        loadPinsCallback?.();
      });

      setCurrentStyle(styleName);
    },
    [userLocation, addUserMarker]
  );

  const initializeMap = useCallback(
    (loadPinsCallback?: (forceRefresh?: boolean) => void) => {
      if (!mapContainer.current) return;

      const defaultCenter: [number, number] = initialCoordinates || [29.0322, 41.0082];
      const defaultZoom = initialCoordinates ? 16 : 10;
      const mapStyle = localStorage.getItem("mapStyle") || "voyager";

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
          sources: {
            cartodb: {
              type: "raster",
              tiles: mapStyles[mapStyle as keyof typeof mapStyles].tiles,
              tileSize: 256,
              attribution: mapStyles[mapStyle as keyof typeof mapStyles].attribution,
            },
          },
          layers: [{ id: "cartodb-tiles", type: "raster", source: "cartodb", minzoom: 0, maxzoom: 20 }],
        },
        center: defaultCenter,
        zoom: defaultZoom,
        minZoom: 7,
        maxZoom: 20,
      });

      map.current.on("load", () => {
        if (map.current) setCurrentZoom(map.current.getZoom());
        if (initialCoordinates) {
          toast.success("Map navigated to coordinates", {
            description: `Lat: ${initialCoordinates[1]}, Lng: ${initialCoordinates[0]}`,
            duration: 4000,
          });
        }
        loadPinsCallback?.();
      });

      map.current.on("moveend", () => loadPinsCallback?.());
      map.current.on("zoomend", () => {
        if (map.current) setCurrentZoom(map.current.getZoom());
        loadPinsCallback?.();
      });
    },
    [initialCoordinates]
  );

  // Location service init
  useEffect(() => {
    locationService.setCallbacks({
      onLocationUpdate: async (coordinates) => {
        setUserLocation(coordinates);
        if (map.current) addUserMarker(coordinates[0], coordinates[1]);
      },
      onPermissionChange: (state) => setLocationPermission(state),
      onError: (error) => console.error("Location error:", error),
    });
    locationService.initialize();
  }, [addUserMarker]);

  return {
    mapContainer,
    map,
    userMarker,
    currentStyle,
    currentZoom,
    locationPermission,
    userLocation,
    user,
    profile,
    addUserMarker,
    getUserLocation,
    goToUserLocation,
    changeMapStyle,
    initializeMap,
  };
};
