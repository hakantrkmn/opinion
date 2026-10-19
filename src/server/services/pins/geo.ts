/**
 * Pure geo helpers for the map API (no DB / server-only imports so they can
 * be unit tested). Coordinates are WGS84 degrees.
 */
import {
  PIN_CREATE_MAX_ACCURACY_SLACK_M,
  PIN_CREATE_MAX_DISTANCE_M,
  PIN_DETAIL_MIN_ZOOM,
} from "@/constants/map";

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** An envelope that never crosses the antimeridian (minLng <= maxLng). */
export type Envelope = Bounds;

/** Mercator projection limit; clusters are computed in this band. */
export const MAX_MERCATOR_LAT = 85.05112878;

/** Approximate on-screen size (px) of one cluster grid cell. */
export const CLUSTER_CELL_PX = 64;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Wrap any longitude into [-180, 180). */
export function wrapLng(lng: number): number {
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/**
 * Normalise a viewport into 1 or 2 envelopes inside [-180, 180]:
 *  - longitudes from a wrapped map (e.g. -190..-170) are wrapped back,
 *  - a viewport crossing the antimeridian (minLng > maxLng after wrapping,
 *    e.g. 170..-170) is split into [minLng, 180] and [-180, maxLng],
 *  - a viewport spanning >= 360° of longitude becomes the whole world.
 * Latitudes are clamped to [-90, 90]. Callers validate minLat < maxLat.
 */
export function toEnvelopes(bounds: Bounds): Envelope[] {
  const minLat = clamp(Math.min(bounds.minLat, bounds.maxLat), -90, 90);
  const maxLat = clamp(Math.max(bounds.minLat, bounds.maxLat), -90, 90);

  const span = bounds.maxLng - bounds.minLng;
  if (span >= 360 || span <= -360) {
    return [{ minLat, maxLat, minLng: -180, maxLng: 180 }];
  }

  // When the caller sends min > max (already-wrapped antimeridian viewport)
  // keep that meaning; otherwise wrap both ends independently.
  const minLng = wrapLng(bounds.minLng);
  let maxLng = wrapLng(bounds.maxLng);
  // wrapLng maps +180 to -180; a viewport ending exactly at the antimeridian
  // must keep 180 as its east edge.
  if (maxLng === -180 && bounds.maxLng > bounds.minLng) maxLng = 180;

  if (minLng <= maxLng) {
    return [{ minLat, maxLat, minLng, maxLng }];
  }
  const parts: Envelope[] = [{ minLat, maxLat, minLng, maxLng: 180 }];
  if (maxLng > -180) parts.push({ minLat, maxLat, minLng: -180, maxLng });
  return parts;
}

/** Cluster zoom: integer in [0, PIN_DETAIL_MIN_ZOOM - 1]. */
export function clampClusterZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 0;
  return clamp(Math.floor(zoom), 0, PIN_DETAIL_MIN_ZOOM - 1);
}

/**
 * Number of grid cells across the whole world at `zoom`. The grid is the
 * Web-Mercator pixel grid divided into CLUSTER_CELL_PX-sized cells, so
 * clusters look evenly spaced on screen at every latitude.
 */
export function clusterGridSize(zoom: number): number {
  return (256 * 2 ** zoom) / CLUSTER_CELL_PX;
}

/** Cell width in degrees of longitude ≈ (360 / 2^zoom) * (CELL_PX / 256). */
export function clusterCellSizeDeg(zoom: number): number {
  return 360 / clusterGridSize(zoom);
}

/** Grid cell index of a point (same formula as the SQL in clusters.ts). */
export function clusterCellOf(
  lat: number,
  lng: number,
  zoom: number
): { ix: number; iy: number } {
  const n = clusterGridSize(zoom);
  const latC = clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
  const latRad = (latC * Math.PI) / 180;
  const x = (lng + 180) / 360;
  const y = 0.5 - Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / (2 * Math.PI);
  return {
    ix: clamp(Math.floor(x * n), 0, n - 1),
    iy: clamp(Math.floor(y * n), 0, n - 1),
  };
}

export function clusterKey(zoom: number, ix: number, iy: number): string {
  return `${zoom}:${ix}:${iy}`;
}

/**
 * Grow the viewport by one cell on every side so clusters whose centroid is
 * just outside the viewport (but whose pins are inside) are complete.
 * One cell in degrees of longitude is always >= one cell in latitude on the
 * Mercator grid, so using it for both axes is conservative.
 */
export function expandBoundsByCell(bounds: Bounds, zoom: number): Bounds {
  const pad = clusterCellSizeDeg(zoom);
  return {
    minLat: clamp(bounds.minLat - pad, -90, 90),
    maxLat: clamp(bounds.maxLat + pad, -90, 90),
    minLng: bounds.minLng - pad,
    maxLng: bounds.maxLng + pad,
  };
}

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in meters (haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Max allowed pin ↔ device distance for a given GPS accuracy (meters). */
export function maxCreateDistanceMeters(accuracy: number): number {
  const slack = Number.isFinite(accuracy)
    ? clamp(accuracy, 0, PIN_CREATE_MAX_ACCURACY_SLACK_M)
    : 0;
  return PIN_CREATE_MAX_DISTANCE_M + slack;
}

/** "You must be there" rule for POST /api/pins. */
export function checkCreateDistance(
  pin: { lat: number; lng: number },
  device: { lat: number; lng: number },
  accuracy: number
): { ok: boolean; distance: number; maxDistance: number } {
  const distance = distanceMeters(pin, device);
  const maxDistance = maxCreateDistanceMeters(accuracy);
  return { ok: distance <= maxDistance, distance, maxDistance };
}
