import { GeoJSONPoint } from "@/types";

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
