import { MapBounds } from "@/types";
export const MIN_ZOOM_LEVEL = 12;
export const USER_LOCATION_CIRCLE_RADIUS = 100;
export const pinQueryKeys = {
  all: ["pins"] as const,
  bounds: (bounds: MapBounds, zoom: number) =>
    [...pinQueryKeys.all, "bounds", bounds, zoom] as const,
  comments: (pinId: string) =>
    [...pinQueryKeys.all, "comments", pinId] as const,
};
