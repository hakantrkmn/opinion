import { USER_LOCATION_CIRCLE_RADIUS } from "@/constants/mapConstants";
import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
interface UserLocationCircleProps {
  map: maplibregl.Map | null;
  coordinates: [number, number] | null; // [longitude, latitude]
  radius?: number; // metre cinsinden yarıçap
  color?: string;
  opacity?: number;
  outlineColor?: string;
}

export const UserLocationCircle = ({
  map,
  coordinates,
  radius = USER_LOCATION_CIRCLE_RADIUS,
  color = "#3B82F6",
  opacity = 0.2,
  outlineColor = "#3B82F6",
}: UserLocationCircleProps) => {
  const circleRef = useRef<{
    sourceId: string;
    layerId: string;
  } | null>(null);

  // Circle koordinatları hesaplama fonksiyonu
  const generateCircleCoordinates = (
    lng: number,
    lat: number,
    radiusInMeters: number
  ): [number, number][] => {
    const coordinates: [number, number][] = [];
    const steps = 64; // Daire kalitesi

    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      const latOffset = (radiusInMeters / 111320) * Math.cos(angle);
      const lngOffset =
        (radiusInMeters / (111320 * Math.cos((lat * Math.PI) / 180))) *
        Math.sin(angle);

      coordinates.push([lng + lngOffset, lat + latOffset]);
    }

    return coordinates;
  };

  // Circle ekleme fonksiyonu
  const addCircle = (lng: number, lat: number) => {
    if (!map || !map.getLayer || !map.getSource) return;

    const sourceId = "user-location-circle";
    const layerId = "user-location-circle";

    try {
      // Önceki circle'ı kaldır
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      // Circle koordinatları oluştur
      const circleCoordinates = generateCircleCoordinates(lng, lat, radius);

      // Circle source ekle
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [circleCoordinates],
          },
          properties: {},
        },
      });

      // Circle layer ekle
      map.addLayer({
        id: layerId,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": color,
          "fill-opacity": opacity,
          "fill-outline-color": outlineColor,
        },
      });

      // Reference'ı kaydet
      circleRef.current = { sourceId, layerId };
    } catch (error) {
      console.warn("Error adding circle:", error);
    }
  };

  // Circle kaldırma fonksiyonu
  const removeCircle = () => {
    if (!map || !circleRef.current) return;

    const { sourceId, layerId } = circleRef.current;

    try {
      if (map.getLayer && map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource && map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    } catch (error) {
      console.warn("Error removing circle:", error);
    }

    circleRef.current = null;
  };

  // Coordinates değiştiğinde circle'ı güncelle
  useEffect(() => {
    if (!map) return;

    if (coordinates) {
      const [lng, lat] = coordinates;
      addCircle(lng, lat);
    } else {
      removeCircle();
    }

    // Cleanup
    return () => {
      removeCircle();
    };
  }, [map, coordinates, radius, color, opacity, outlineColor]);

  // Component unmount olduğunda circle'ı kaldır
  useEffect(() => {
    return () => {
      removeCircle();
    };
  }, [map]);

  // Bu component sadece logic yapıyor, UI render etmiyor
  return null;
};
