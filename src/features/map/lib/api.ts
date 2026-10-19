import { apiClient } from "@/lib/api/client";
import type {
  PinClustersResponse,
  PinScope,
  PinsInBoundsResponse,
} from "@/types/api";
import { bboxSearchParams, type BBox } from "./geo";

export function fetchPinClusters(
  bbox: BBox,
  zoom: number,
  scope: PinScope,
  signal?: AbortSignal
) {
  const params = new URLSearchParams({
    ...bboxSearchParams(bbox),
    zoom: String(zoom),
    scope,
  });
  return apiClient<PinClustersResponse>(`/api/pins/clusters?${params}`, {
    signal,
  });
}

export function fetchPinsInBounds(
  bbox: BBox,
  scope: PinScope,
  signal?: AbortSignal
) {
  const params = new URLSearchParams({ ...bboxSearchParams(bbox), scope });
  return apiClient<PinsInBoundsResponse>(`/api/pins?${params}`, { signal });
}
