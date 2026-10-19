import type { LngLat } from "./geo";

export interface MapView {
  center: LngLat;
  zoom: number;
}

const VIEW_KEY = "dropinion:map-view";
/** Istanbul — the community's home turf. */
export const DEFAULT_VIEW: MapView = { center: [29.0322, 41.0082], zoom: 10 };
export const DEEP_LINK_ZOOM = 16;

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export function readCachedView(): MapView | null {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MapView>;
    const [lng, lat] = parsed.center ?? [];
    if (isFiniteNumber(lng) && isFiniteNumber(lat) && isFiniteNumber(parsed.zoom)) {
      return { center: [lng, lat], zoom: parsed.zoom };
    }
  } catch {
    // storage unavailable or corrupted
  }
  return null;
}

export function writeCachedView(view: MapView) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    // storage unavailable (private mode, quota) — not important
  }
}

/** Parses `lat` + `lng` (or legacy `long`) query params. */
export function parseLngLat(
  lat: string | undefined | null,
  lng: string | undefined | null
): LngLat | null {
  if (!lat || !lng) return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  return [ln, la];
}
