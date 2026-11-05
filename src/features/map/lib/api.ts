import { apiClient } from "@/lib/api/client";
import type { PinClustersResponse, PinsInBoundsResponse } from "@/types/api";
import type { MapFilter } from "../hooks/useMapScope";
import { bboxSearchParams, type BBox } from "./geo";

function filterParams(filter: MapFilter): Record<string, string> {
  return filter.scope === "community" && filter.communityId
    ? { scope: filter.scope, community_id: filter.communityId }
    : { scope: filter.scope };
}

export function fetchPinClusters(
  bbox: BBox,
  zoom: number,
  filter: MapFilter,
  signal?: AbortSignal
) {
  const params = new URLSearchParams({
    ...bboxSearchParams(bbox),
    zoom: String(zoom),
    ...filterParams(filter),
  });
  return apiClient<PinClustersResponse>(`/api/pins/clusters?${params}`, {
    signal,
  });
}

export function fetchPinsInBounds(
  bbox: BBox,
  filter: MapFilter,
  signal?: AbortSignal
) {
  const params = new URLSearchParams({ ...bboxSearchParams(bbox), ...filterParams(filter) });
  return apiClient<PinsInBoundsResponse>(`/api/pins?${params}`, { signal });
}
