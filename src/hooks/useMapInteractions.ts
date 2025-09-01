import { mapStyles } from "@/utils/variables";
import maplibregl from "maplibre-gl";
import { useCallback } from "react";
import { toast } from "sonner";

export const useMapInteractions = (
  map: React.MutableRefObject<maplibregl.Map | null>,
  mapContainer: React.MutableRefObject<HTMLDivElement | null>,
  setCurrentStyle: (style: string) => void,
  setCurrentZoom: (zoom: number) => void,
  userLocation: [number, number] | null,
  addUserMarker: (lng: number, lat: number) => void,
  loadPinsFromMapWithCache: (forceRefresh?: boolean) => void,
  initialCoordinates?: [number, number] | null
) => {
  // Change map style
  const changeMapStyle = useCallback(
    (styleName: string) => {
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
          loadPinsFromMapWithCache();
        }
      });

      setCurrentStyle(styleName);
    },
    [
      map,
      setCurrentStyle,
      userLocation,
      addUserMarker,
      loadPinsFromMapWithCache,
    ]
  );

  // Initialize map
  const initializeMap = useCallback(() => {
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

    map.current = new maplibregl.Map({
      container: mapContainer.current!,
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
      if (map.current) {
        setCurrentZoom(map.current.getZoom());
      }

      if (initialCoordinates) {
        toast.success("Map navigated to coordinates", {
          description: `Latitude: ${initialCoordinates[1]}, Longitude: ${initialCoordinates[0]}`,
          duration: 4000,
        });
      }

      loadPinsFromMapWithCache();
    });

    map.current.on("moveend", () => {
      loadPinsFromMapWithCache();
    });

    map.current.on("zoomend", () => {
      if (map.current) {
        setCurrentZoom(map.current.getZoom());
      }
      loadPinsFromMapWithCache();
    });
  }, [
    map,
    mapContainer,
    initialCoordinates,
    setCurrentZoom,
    loadPinsFromMapWithCache,
  ]);
  return {
    changeMapStyle,
    initializeMap,
  };
};
