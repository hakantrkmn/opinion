import { describe, expect, it } from "vitest";
import {
  checkCreateDistance,
  clampClusterZoom,
  clusterCellOf,
  clusterCellSizeDeg,
  clusterGridSize,
  distanceMeters,
  expandBoundsByCell,
  maxCreateDistanceMeters,
  toEnvelopes,
  wrapLng,
} from "../geo";
import { escapeLike } from "../like";
import {
  PIN_CREATE_MAX_ACCURACY_SLACK_M,
  PIN_CREATE_MAX_DISTANCE_M,
  PIN_DETAIL_MIN_ZOOM,
} from "@/constants/map";

describe("toEnvelopes (bbox / antimeridian)", () => {
  it("keeps a normal viewport as one envelope", () => {
    expect(toEnvelopes({ minLat: 40, maxLat: 41, minLng: 28, maxLng: 29 })).toEqual([
      { minLat: 40, maxLat: 41, minLng: 28, maxLng: 29 },
    ]);
  });

  it("splits a viewport crossing the antimeridian (min > max)", () => {
    expect(toEnvelopes({ minLat: -20, maxLat: -10, minLng: 170, maxLng: -170 })).toEqual([
      { minLat: -20, maxLat: -10, minLng: 170, maxLng: 180 },
      { minLat: -20, maxLat: -10, minLng: -180, maxLng: -170 },
    ]);
  });

  it("wraps longitudes from a world-copy viewport and splits them", () => {
    expect(toEnvelopes({ minLat: 0, maxLat: 10, minLng: 170, maxLng: 190 })).toEqual([
      { minLat: 0, maxLat: 10, minLng: 170, maxLng: 180 },
      { minLat: 0, maxLat: 10, minLng: -180, maxLng: -170 },
    ]);
    expect(toEnvelopes({ minLat: 0, maxLat: 10, minLng: -200, maxLng: -190 })).toEqual([
      { minLat: 0, maxLat: 10, minLng: 160, maxLng: 170 },
    ]);
  });

  it("treats a >= 360° span as the whole world", () => {
    expect(toEnvelopes({ minLat: -90, maxLat: 90, minLng: -540, maxLng: 540 })).toEqual([
      { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 },
    ]);
  });

  it("keeps 180 as an east edge and clamps latitude", () => {
    expect(toEnvelopes({ minLat: -95, maxLat: 95, minLng: 10, maxLng: 180 })).toEqual([
      { minLat: -90, maxLat: 90, minLng: 10, maxLng: 180 },
    ]);
  });

  it("wrapLng maps into [-180, 180)", () => {
    expect(wrapLng(190)).toBe(-170);
    expect(wrapLng(-190)).toBe(170);
    expect(wrapLng(540)).toBe(-180);
    expect(wrapLng(0)).toBe(0);
  });
});

describe("clusters", () => {
  it("clamps zoom to [0, PIN_DETAIL_MIN_ZOOM - 1] and floors it", () => {
    expect(clampClusterZoom(-3)).toBe(0);
    expect(clampClusterZoom(5.7)).toBe(5);
    expect(clampClusterZoom(30)).toBe(PIN_DETAIL_MIN_ZOOM - 1);
    expect(clampClusterZoom(Number.NaN)).toBe(0);
  });

  it("cell size ≈ (360 / 2^zoom) * (CELL_PX / 256)", () => {
    expect(clusterCellSizeDeg(0)).toBeCloseTo(90, 10); // 64px cells → 4 per 256px tile
    expect(clusterCellSizeDeg(10)).toBeCloseTo(360 / 1024 / 4, 12);
    expect(clusterGridSize(3)).toBe(32);
  });

  it("assigns stable, in-range cell indices", () => {
    const n = clusterGridSize(5);
    for (const [lat, lng] of [
      [0, 0],
      [41.0082, 28.9784],
      [89.9, 179.999],
      [-89.9, -180],
    ]) {
      const { ix, iy } = clusterCellOf(lat, lng, 5);
      expect(ix).toBeGreaterThanOrEqual(0);
      expect(ix).toBeLessThan(n);
      expect(iy).toBeGreaterThanOrEqual(0);
      expect(iy).toBeLessThan(n);
    }
    // Equator / prime meridian is exactly the middle of the grid.
    expect(clusterCellOf(0.0001, 0.0001, 5)).toEqual({ ix: n / 2, iy: n / 2 - 1 });
    // Northern latitudes have smaller y (tile space grows southwards).
    expect(clusterCellOf(60, 0, 5).iy).toBeLessThan(clusterCellOf(10, 0, 5).iy);
  });

  it("expands the viewport by one cell", () => {
    const b = expandBoundsByCell({ minLat: 40, maxLat: 41, minLng: 28, maxLng: 29 }, 6);
    const pad = clusterCellSizeDeg(6);
    expect(b.minLng).toBeCloseTo(28 - pad);
    expect(b.maxLat).toBeCloseTo(41 + pad);
    expect(expandBoundsByCell({ minLat: -89, maxLat: 89, minLng: 0, maxLng: 1 }, 0).maxLat).toBe(90);
  });
});

describe("create-distance rule", () => {
  it("haversine distance is sane", () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0);
    // 1° of latitude ≈ 111.2 km
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -2);
    // Taksim → Kadıköy ≈ 5.6 km
    const d = distanceMeters({ lat: 41.0369, lng: 28.985 }, { lat: 40.9903, lng: 29.0291 });
    expect(d).toBeGreaterThan(5_000);
    expect(d).toBeLessThan(7_000);
  });

  it("caps the accuracy slack", () => {
    expect(maxCreateDistanceMeters(0)).toBe(PIN_CREATE_MAX_DISTANCE_M);
    expect(maxCreateDistanceMeters(20)).toBe(PIN_CREATE_MAX_DISTANCE_M + 20);
    expect(maxCreateDistanceMeters(5_000)).toBe(
      PIN_CREATE_MAX_DISTANCE_M + PIN_CREATE_MAX_ACCURACY_SLACK_M
    );
    expect(maxCreateDistanceMeters(-10)).toBe(PIN_CREATE_MAX_DISTANCE_M);
  });

  it("accepts pins within range and rejects pins too far away", () => {
    const device = { lat: 41.0, lng: 29.0 };
    const near = { lat: 41.0008, lng: 29.0 }; // ~89 m
    const edge = { lat: 41.0012, lng: 29.0 }; // ~133 m
    expect(checkCreateDistance(near, device, 0).ok).toBe(true);
    expect(checkCreateDistance(edge, device, 0).ok).toBe(false);
    expect(checkCreateDistance(edge, device, 40).ok).toBe(true);
    expect(checkCreateDistance(edge, device, 1_000).ok).toBe(true); // slack capped at 50
    expect(checkCreateDistance({ lat: 41.002, lng: 29 }, device, 1_000).ok).toBe(false);
  });
});

describe("escapeLike", () => {
  it("escapes LIKE wildcards and the escape char", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
    expect(escapeLike("Kadıköy")).toBe("Kadıköy");
  });
});
