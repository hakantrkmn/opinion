import { MapBounds, Pin } from "@/types";

interface CacheEntry {
  bounds: MapBounds;
  pins: Pin[];
  timestamp: number;
  zoom: number;
}

export class SimpleMapCache {
  private cache = new Map<string, CacheEntry>();
  private maxAge = 10 * 60 * 1000; // 10 dakika

  private getCacheKey(bounds: MapBounds, zoom: number): string {
    // Grid-based key - 0.5 derece grid'ler
    const gridSize = 0.5;
    const minLatGrid = Math.floor(bounds.minLat / gridSize);
    const maxLatGrid = Math.floor(bounds.maxLat / gridSize);
    const minLngGrid = Math.floor(bounds.minLng / gridSize);
    const maxLngGrid = Math.floor(bounds.maxLng / gridSize);

    return `${minLatGrid}_${maxLatGrid}_${minLngGrid}_${maxLngGrid}_${zoom}`;
  }

  get(bounds: MapBounds, zoom: number): Pin[] | null {
    const key = this.getCacheKey(bounds, zoom);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Cache süresi dolmuş mu kontrol et
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.pins;
  }

  set(bounds: MapBounds, zoom: number, pins: Pin[]): void {
    const key = this.getCacheKey(bounds, zoom);
    this.cache.set(key, {
      bounds,
      pins,
      timestamp: Date.now(),
      zoom,
    });
  }

  // Refresh için cache'i temizle
  clear(): void {
    this.cache.clear();
  }

  // Belirli alanın cache'ini temizle
  clearArea(bounds: MapBounds, zoom: number): void {
    const key = this.getCacheKey(bounds, zoom);
    this.cache.delete(key);
  }
}
