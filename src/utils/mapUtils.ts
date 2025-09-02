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
      color:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    };
  if (count <= 3)
    return {
      text: "Active",
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    };
  if (count <= 10)
    return {
      text: "Popular",
      color:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    };
  return {
    text: "Very Active",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };
};
export const getPinColor = (commentCount?: number) => {
  if (!commentCount || commentCount === 0)
    return "bg-destructive hover:bg-destructive";
  if (commentCount <= 3)
    return "bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700";
  if (commentCount <= 10)
    return "bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700";
  return "bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700";
};
