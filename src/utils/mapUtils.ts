import { GeoJSONPoint, MapBounds } from "@/types";

export const parseLocation = (location: GeoJSONPoint): [number, number] => {
  if (!location) {
    console.warn("Invalid location:", location);
    return [0, 0];
  }
  if (location.type === "Point" && location.coordinates) {
    const [lng, lat] = location.coordinates;
    return [lng, lat];
  }
  console.warn("Could not parse location:", location);
  return [0, 0];
};
export function getBoundsKey(bounds: MapBounds, zoom: number): string {
  const getGridSize = (zoom: number) => {
    if (zoom >= 15) return 0.01;
    if (zoom >= 12) return 0.02;
    if (zoom >= 10) return 0.05;
    return 0.1;
  };

  const gridSize = getGridSize(zoom);
  const gridMinLat = Math.floor(bounds.minLat / gridSize) * gridSize;
  const gridMaxLat = Math.ceil(bounds.maxLat / gridSize) * gridSize;
  const gridMinLng = Math.floor(bounds.minLng / gridSize) * gridSize;
  const gridMaxLng = Math.ceil(bounds.maxLng / gridSize) * gridSize;

  return [
    gridMinLat.toFixed(3),
    gridMaxLat.toFixed(3),
    gridMinLng.toFixed(3),
    gridMaxLng.toFixed(3),
    zoom,
  ].join(",");
}
export const getActivityBadge = (count?: number) => {
  if (!count || count === 0)
    return {
      text: "New",
      color: "bg-primary/10 text-primary",
    };
  if (count <= 3)
    return {
      text: "Active",
      color: "bg-primary/15 text-primary",
    };
  if (count <= 10)
    return {
      text: "Popular",
      color: "bg-primary/20 text-primary",
    };
  return {
    text: "Very Active",
    color: "bg-primary/25 text-primary",
  };
};
export const getPinColor = (commentCount?: number) => {
  if (!commentCount || commentCount === 0)
    return "bg-destructive hover:bg-destructive/90";
  if (commentCount <= 3)
    return "bg-primary hover:bg-primary/90";
  if (commentCount <= 10)
    return "bg-primary/80 hover:bg-primary/70";
  return "bg-primary/60 hover:bg-primary/50";
};
