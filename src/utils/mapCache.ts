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

  protected getCacheKey(bounds: MapBounds, zoom: number): string {
    // Daha büyük grid'ler kullan - zoom seviyesine göre dinamik
    let gridSize: number;

    if (zoom >= 15) {
      gridSize = 0.01; // Çok yakın zoom - küçük grid
    } else if (zoom >= 12) {
      gridSize = 0.05; // Orta zoom - orta grid
    } else if (zoom >= 10) {
      gridSize = 0.1; // Uzak zoom - büyük grid
    } else {
      gridSize = 0.5; // Çok uzak zoom - çok büyük grid
    }

    // Bounds'un merkez noktasını al ve grid'e hizala
    const centerLat = (bounds.minLat + bounds.maxLat) / 2;
    const centerLng = (bounds.minLng + bounds.maxLng) / 2;

    const latGrid = Math.floor(centerLat / gridSize);
    const lngGrid = Math.floor(centerLng / gridSize);

    return `${latGrid}_${lngGrid}_${zoom}`;
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
