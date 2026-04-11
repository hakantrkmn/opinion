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
