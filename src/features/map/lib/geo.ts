export type LngLat = [lng: number, lat: number];

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Polygon approximating a circle of `radiusM` meters around `center`. */
export function circlePolygon(
  center: LngLat,
  radiusM: number,
  steps = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center;
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLng = dLat / Math.max(Math.cos(toRad(lat)), 1e-6);
  const ring: LngLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

export function containsBBox(outer: BBox, inner: BBox): boolean {
  return (
    inner.minLng >= outer.minLng &&
    inner.maxLng <= outer.maxLng &&
    inner.minLat >= outer.minLat &&
    inner.maxLat <= outer.maxLat
  );
}

export function containsPoint(b: BBox, lng: number, lat: number): boolean {
  return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
}

const MAX_LAT = 85.0511;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 1e6) / 1e6;

/**
 * Pads the viewport by `pad` (fraction of its size) on every side and snaps it
 * outward to a grid whose cell size depends on the zoom level
 * (one web-mercator tile width at that zoom). Small pans therefore produce
 * the same bbox — and the same TanStack Query key — so they hit the cache.
 */
export function quantizeBBox(viewport: BBox, zoom: number, pad = 0.25): BBox {
  const cell = 360 / 2 ** Math.max(0, Math.floor(zoom));
  const w = viewport.maxLng - viewport.minLng;
  const h = viewport.maxLat - viewport.minLat;
  const snapDown = (v: number) => Math.floor(v / cell) * cell;
  const snapUp = (v: number) => Math.ceil(v / cell) * cell;
  return {
    minLng: round(clamp(snapDown(viewport.minLng - w * pad), -180, 180)),
    maxLng: round(clamp(snapUp(viewport.maxLng + w * pad), -180, 180)),
    minLat: round(clamp(snapDown(viewport.minLat - h * pad), -MAX_LAT, MAX_LAT)),
    maxLat: round(clamp(snapUp(viewport.maxLat + h * pad), -MAX_LAT, MAX_LAT)),
  };
}

export function bboxKey(b: BBox): string {
  return `${b.minLng},${b.minLat},${b.maxLng},${b.maxLat}`;
}

export function bboxSearchParams(b: BBox): Record<string, string> {
  return {
    minLat: String(b.minLat),
    maxLat: String(b.maxLat),
    minLng: String(b.minLng),
    maxLng: String(b.maxLng),
  };
}
