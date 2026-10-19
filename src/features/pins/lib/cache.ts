import { queryKeys } from "@/lib/api/query-keys";
import type {
  PinResponse,
  PinsInBoundsResponse,
  PinSummary,
} from "@/types/api";
import type { QueryClient } from "@tanstack/react-query";
import { containsPoint, type BBox } from "@/features/map/lib/geo";

/** ["pins","bbox",scope,"minLng,minLat,maxLng,maxLat"] → BBox */
function bboxFromKey(key: readonly unknown[]): BBox | null {
  const raw = key[3];
  if (typeof raw !== "string") return null;
  const [minLng, minLat, maxLng, maxLat] = raw.split(",").map(Number);
  if ([minLng, minLat, maxLng, maxLat].some((n) => !Number.isFinite(n))) return null;
  return { minLng, minLat, maxLng, maxLat };
}

/** Finds a pin summary in any cached detail/bbox query (for instant UI). */
export function findCachedPin(
  queryClient: QueryClient,
  pinId: string
): { pin: PinSummary; updatedAt: number } | undefined {
  const detail = queryClient.getQueryState<PinResponse>(queryKeys.pins.detail(pinId));
  if (detail?.data) return { pin: detail.data.pin, updatedAt: detail.dataUpdatedAt };

  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.pins.bboxAll })) {
    const data = query.state.data as PinsInBoundsResponse | undefined;
    const pin = data?.pins.find((p) => p.id === pinId);
    if (pin) return { pin, updatedAt: query.state.dataUpdatedAt };
  }
  return undefined;
}

/** Applies `update` to the pin in every cached bbox + detail query. */
export function patchCachedPin(
  queryClient: QueryClient,
  pinId: string,
  update: (pin: PinSummary) => PinSummary
) {
  queryClient.setQueriesData<PinsInBoundsResponse>(
    { queryKey: queryKeys.pins.bboxAll },
    (data) => {
      if (!data?.pins.some((p) => p.id === pinId)) return data;
      return {
        ...data,
        pins: data.pins.map((p) => (p.id === pinId ? update(p) : p)),
      };
    }
  );
  queryClient.setQueryData<PinResponse>(queryKeys.pins.detail(pinId), (data) =>
    data ? { pin: update(data.pin) } : data
  );
}

export function adjustCommentsCount(
  queryClient: QueryClient,
  pinId: string,
  delta: number
) {
  patchCachedPin(queryClient, pinId, (p) => ({
    ...p,
    comments_count: Math.max(0, p.comments_count + delta),
  }));
}

/** Adds a freshly created pin to every cached "all" bbox that contains it. */
export function addCachedPin(queryClient: QueryClient, pin: PinSummary) {
  queryClient.setQueryData<PinResponse>(queryKeys.pins.detail(pin.id), { pin });
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: queryKeys.pins.bboxAll })) {
    if (query.queryKey[2] !== "all") continue;
    const bbox = bboxFromKey(query.queryKey);
    const data = query.state.data as PinsInBoundsResponse | undefined;
    if (!bbox || !data || !containsPoint(bbox, pin.lng, pin.lat)) continue;
    if (data.pins.some((p) => p.id === pin.id)) continue;
    queryClient.setQueryData<PinsInBoundsResponse>(query.queryKey, {
      ...data,
      pins: [pin, ...data.pins],
    });
  }
  // Clusters are server-aggregated and "following" membership is decided by
  // the server: refresh those instead of guessing.
  void queryClient.invalidateQueries({ queryKey: queryKeys.pins.clustersAll });
  void queryClient.invalidateQueries({
    queryKey: [...queryKeys.pins.bboxAll, "following"],
  });
}

/** Removes a pin from every map cache (after delete / last comment removed). */
export function removeCachedPin(queryClient: QueryClient, pinId: string) {
  queryClient.setQueriesData<PinsInBoundsResponse>(
    { queryKey: queryKeys.pins.bboxAll },
    (data) =>
      data?.pins.some((p) => p.id === pinId)
        ? { ...data, pins: data.pins.filter((p) => p.id !== pinId) }
        : data
  );
  // Detail/comment queries are left alone: the closing sheet may still observe
  // them, and removing them would refetch (404) mid-animation. They go stale
  // and get garbage-collected; a later visit refetches and shows "not found".
  void queryClient.invalidateQueries({ queryKey: queryKeys.pins.clustersAll });
}
