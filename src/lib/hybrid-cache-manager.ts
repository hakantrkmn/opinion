import { MapBounds, Pin } from "@/types";

interface CachedPin {
  pin: Pin;
  timestamp: number;
  hitCount: number;
  lastAccessed: number;
}

interface SpatialIndex {
  [key: string]: Set<string>; // tile -> pin IDs
}

export class HybridCacheManager {
  private pinCache = new Map<string, CachedPin>(); // pin ID -> pin data
  private spatialIndex: SpatialIndex = {}; // tile -> pin IDs
  private maxAge = 10 * 60 * 1000; // 10 minutes
  private maxPins = 1000; // Maximum cached pins

  // Convert coordinates to tile key
  private getTileKey(lat: number, lng: number, zoom: number): string {
    const scale = Math.pow(2, Math.max(0, zoom - 8)); // Adjust scale based on zoom
    const tileX = Math.floor(lng * scale);
    const tileY = Math.floor(lat * scale);
    return `${zoom}_${tileX}_${tileY}`;
  }

  // Get tiles that intersect with bounds
  private getTilesForBounds(bounds: MapBounds, zoom: number): string[] {
    const tiles = new Set<string>();

    // Sample points across the bounds
    const latStep = (bounds.maxLat - bounds.minLat) / 4;
    const lngStep = (bounds.maxLng - bounds.minLng) / 4;

    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
      for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += lngStep) {
        tiles.add(this.getTileKey(lat, lng, zoom));
      }
    }

    return Array.from(tiles);
  }

  // Cache a pin
  cachePin(pin: Pin): void {
    const now = Date.now();

    // Add to pin cache
    this.pinCache.set(pin.id, {
      pin,
      timestamp: now,
      hitCount: 0,
      lastAccessed: now,
    });

    // Add to spatial index
    const [lng, lat] = pin.location.coordinates;
    const tiles = [
      this.getTileKey(lat, lng, 10),
      this.getTileKey(lat, lng, 12),
      this.getTileKey(lat, lng, 15),
    ];

    tiles.forEach((tile) => {
      if (!this.spatialIndex[tile]) {
        this.spatialIndex[tile] = new Set();
      }
      this.spatialIndex[tile].add(pin.id);
    });

    // Evict if too many pins
    if (this.pinCache.size > this.maxPins) {
      this.evictLRU();
    }
  }

  // Get pins for bounds
  getPinsForBounds(bounds: MapBounds, zoom: number): Pin[] | null {
    const tiles = this.getTilesForBounds(bounds, zoom);
    const pinIds = new Set<string>();

    // Collect all pin IDs from relevant tiles
    tiles.forEach((tile) => {
      const tilePins = this.spatialIndex[tile];
      if (tilePins) {
        tilePins.forEach((pinId) => pinIds.add(pinId));
      }
    });

    if (pinIds.size === 0) {
      return null; // Cache miss
    }

    // Get pins from cache
    const pins: Pin[] = [];
    const now = Date.now();

    pinIds.forEach((pinId) => {
      const cached = this.pinCache.get(pinId);
      if (cached && now - cached.timestamp < this.maxAge) {
        // Check if pin is actually in bounds
        const [lng, lat] = cached.pin.location.coordinates;
        if (
          lat >= bounds.minLat &&
          lat <= bounds.maxLat &&
          lng >= bounds.minLng &&
          lng <= bounds.maxLng
        ) {
          pins.push(cached.pin);
          cached.hitCount++;
          cached.lastAccessed = now;
        }
      }
    });

    return pins.length > 0 ? pins : null;
  }

  // Cache multiple pins from API response
  cachePinsFromBounds(bounds: MapBounds, zoom: number, pins: Pin[]): void {
    pins.forEach((pin) => this.cachePin(pin));
  }

  // Update pin in cache
  updatePinInCache(pinId: string, updates: Partial<Pin>): void {
    const cached = this.pinCache.get(pinId);
    if (cached) {
      cached.pin = { ...cached.pin, ...updates };
      cached.lastAccessed = Date.now();
    }
  }

  // Remove pin from cache
  removePinFromCache(pinId: string): void {
    this.removePin(pinId);
  }

  // Update comment count for a pin
  updateCommentCountInCache(pinId: string, delta: number): void {
    const cached = this.pinCache.get(pinId);
    if (cached) {
      const currentCount = cached.pin.comments_count || 0;
      cached.pin = {
        ...cached.pin,
        comments_count: Math.max(0, currentCount + delta),
        updated_at: new Date().toISOString(),
      };
      cached.lastAccessed = Date.now();
    }
  }

  // Invalidate cache entries that contain a specific pin
  invalidateRelatedAreas(pinId: string): void {
    const cached = this.pinCache.get(pinId);
    if (cached) {
      this.removePin(pinId);
    }
  }

  // Get cached pins (for compatibility)
  get(bounds: MapBounds, zoom: number): Pin[] | null {
    return this.getPinsForBounds(bounds, zoom);
  }

  // Set pins in cache (for compatibility)
  set(bounds: MapBounds, zoom: number, pins: Pin[]): void {
    this.cachePinsFromBounds(bounds, zoom, pins);
  }

  // Clear cache for specific area
  clearArea(bounds: MapBounds, zoom: number): void {
    const tiles = this.getTilesForBounds(bounds, zoom);
    const pinsToRemove = new Set<string>();

    // Collect pins from relevant tiles
    tiles.forEach((tile) => {
      const tilePins = this.spatialIndex[tile];
      if (tilePins) {
        tilePins.forEach((pinId) => pinsToRemove.add(pinId));
      }
    });

    // Remove pins that are actually in the bounds
    pinsToRemove.forEach((pinId) => {
      const cached = this.pinCache.get(pinId);
      if (cached) {
        const [lng, lat] = cached.pin.location.coordinates;
        if (
          lat >= bounds.minLat &&
          lat <= bounds.maxLat &&
          lng >= bounds.minLng &&
          lng <= bounds.maxLng
        ) {
          this.removePin(pinId);
        }
      }
    });
  }

  // LRU eviction
  private evictLRU(): void {
    let oldestPin: string | null = null;
    let oldestTime = Date.now();

    for (const [pinId, cached] of this.pinCache.entries()) {
      const score = cached.lastAccessed - cached.hitCount * 60000; // Favor frequently accessed
      if (score < oldestTime) {
        oldestTime = score;
        oldestPin = pinId;
      }
    }

    if (oldestPin) {
      this.removePin(oldestPin);
    }
  }

  // Remove pin from cache and spatial index
  private removePin(pinId: string): void {
    const cached = this.pinCache.get(pinId);
    if (!cached) return;

    // Remove from pin cache
    this.pinCache.delete(pinId);

    // Remove from spatial index
    const [lng, lat] = cached.pin.location.coordinates;
    const tiles = [
      this.getTileKey(lat, lng, 10),
      this.getTileKey(lat, lng, 12),
      this.getTileKey(lat, lng, 15),
    ];

    tiles.forEach((tile) => {
      if (this.spatialIndex[tile]) {
        this.spatialIndex[tile].delete(pinId);
        if (this.spatialIndex[tile].size === 0) {
          delete this.spatialIndex[tile];
        }
      }
    });
  }

  // Update pin in cache
  updatePin(pinId: string, updates: Partial<Pin>): void {
    const cached = this.pinCache.get(pinId);
    if (cached) {
      cached.pin = { ...cached.pin, ...updates };
      cached.lastAccessed = Date.now();
    }
  }

  // Delete pin from cache
  deletePin(pinId: string): void {
    this.removePin(pinId);
  }

  // Clear all cache
  clear(): void {
    this.pinCache.clear();
    this.spatialIndex = {};
  }

  // Alias for clear
  clearAll(): void {
    this.clear();
  }

  // Get cache stats
  getStats() {
    const totalHits = Array.from(this.pinCache.values()).reduce(
      (sum, cached) => sum + cached.hitCount,
      0
    );

    return {
      totalPins: this.pinCache.size,
      totalTiles: Object.keys(this.spatialIndex).length,
      totalHits,
      memoryUsage: this.pinCache.size * 1000, // Rough estimate
    };
  }
}
