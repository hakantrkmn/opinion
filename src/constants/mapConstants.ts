import { MapBounds } from "@/types";

export const pinQueryKeys = {
  all: ["pins"] as const,
  bounds: (bounds: MapBounds, zoom: number) =>
    [...pinQueryKeys.all, "bounds", bounds, zoom] as const,
  comments: (pinId: string) =>
    [...pinQueryKeys.all, "comments", pinId] as const,
};
