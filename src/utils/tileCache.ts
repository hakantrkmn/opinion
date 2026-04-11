import type { MapBounds, Pin } from "@/types";

export const PIN_TILE_ZOOM = 14;
export const MIN_PIN_TILE_ZOOM = 7;

/**
 * Pick a tile zoom level for a given map zoom so the viewport always covers
 * roughly 4–9 tiles. Capped at PIN_TILE_ZOOM so zooming further in keeps
 * reusing the same cached tiles.
 */
export function pinTileZoomFor(mapZoom: number): number {
  return Math.max(MIN_PIN_TILE_ZOOM, Math.min(PIN_TILE_ZOOM, Math.floor(mapZoom)));
}

export interface TileCoord {
  x: number;
  y: number;
  key: string;
}

export function lngLatToTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  const clamp = (v: number) => Math.max(0, Math.min(n - 1, v));
  return { x: clamp(x), y: clamp(y) };
}

export function tileToBounds(x: number, y: number, z: number): MapBounds {
  const n = 2 ** z;
  const lngMin = (x / n) * 360 - 180;
  const lngMax = ((x + 1) / n) * 360 - 180;
  const latMax = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const latMin = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  return { minLat: latMin, maxLat: latMax, minLng: lngMin, maxLng: lngMax };
}

export function tileKey(x: number, y: number, z: number): string {
  return `${z}/${x}/${y}`;
}

export function boundsToTiles(
  bounds: MapBounds,
  z: number,
  maxTiles = Infinity
): TileCoord[] {
  const topLeft = lngLatToTile(bounds.minLng, bounds.maxLat, z);
  const bottomRight = lngLatToTile(bounds.maxLng, bounds.minLat, z);

  const width = bottomRight.x - topLeft.x + 1;
  const height = bottomRight.y - topLeft.y + 1;
  if (width <= 0 || height <= 0) return [];
  if (width * height > maxTiles) return [];

  const tiles: TileCoord[] = [];
  for (let x = topLeft.x; x <= bottomRight.x; x++) {
    for (let y = topLeft.y; y <= bottomRight.y; y++) {
      tiles.push({ x, y, key: tileKey(x, y, z) });
    }
  }
  return tiles;
}

export function tileKeyForPin(pin: Pin, z: number = PIN_TILE_ZOOM): string {
  const [lng, lat] = pin.location.coordinates;
  const { x, y } = lngLatToTile(lng, lat, z);
  return tileKey(x, y, z);
}

interface TileEntry {
  pins: Pin[];
  lastUsed: number;
}

export class TileCache {
  private entries = new Map<string, TileEntry>();
  private readonly maxEntries: number;
  private tick = 0;

  constructor(maxEntries = 64) {
    this.maxEntries = maxEntries;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  get(key: string): Pin[] | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    entry.lastUsed = ++this.tick;
    return entry.pins;
  }

  set(key: string, pins: Pin[]): void {
    this.entries.set(key, { pins, lastUsed: ++this.tick });
    if (this.entries.size > this.maxEntries) this.evict();
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
    this.tick = 0;
  }

  removePinById(pinId: string): boolean {
    let removed = false;
    for (const entry of this.entries.values()) {
      const idx = entry.pins.findIndex((p) => p.id === pinId);
      if (idx !== -1) {
        entry.pins.splice(idx, 1);
        removed = true;
      }
    }
    return removed;
  }

  size(): number {
    return this.entries.size;
  }

  allPins(): Pin[] {
    const seen = new Map<string, Pin>();
    for (const entry of this.entries.values()) {
      for (const pin of entry.pins) {
        if (!seen.has(pin.id)) seen.set(pin.id, pin);
      }
    }
    return Array.from(seen.values());
  }

  private evict(): void {
    let oldestKey: string | null = null;
    let oldestTick = Infinity;
    for (const [key, entry] of this.entries) {
      if (entry.lastUsed < oldestTick) {
        oldestTick = entry.lastUsed;
        oldestKey = key;
      }
    }
    if (oldestKey !== null) this.entries.delete(oldestKey);
  }
}
