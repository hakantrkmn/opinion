import { MapBounds, Pin } from "@/types";
import { Session, User } from "@supabase/supabase-js";
import { QueryClient } from "@tanstack/react-query";

interface SpatialIndex {
  [key: string]: Set<string>; // tile -> pin IDs
}

interface CacheStats {
  totalPins: number;
  totalTiles: number;
  totalHits: number;
  memoryUsage: number;
  sessionCacheHits: number;
}

export class HybridCacheManager {
  private queryClient: QueryClient;
  private spatialIndex: SpatialIndex = {}; // tile -> pin IDs
  private hitCount = 0; // Track cache hits for stats
  private sessionHitCount = 0; // Track session cache hits

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  // ===== SESSION CACHE METHODS =====

  // Cache session data
  cacheSession(session: Session | null): void {
    this.queryClient.setQueryData(["session"], session);
    if (session?.user) {
      this.queryClient.setQueryData(["user"], session.user);
    }
  }

  // Get session from cache
  getSession(): Session | null {
    const session = this.queryClient.getQueryData<Session>(["session"]);
    if (session) {
      this.sessionHitCount++;
    }
    return session || null;
  }

  // Get user from cache
  getUser(): User | null {
    const user = this.queryClient.getQueryData<User>(["user"]);
    if (user) {
      this.sessionHitCount++;
    }
    return user || null;
  }

  // Clear session cache
  clearSession(): void {
    this.queryClient.removeQueries({ queryKey: ["session"] });
    this.queryClient.removeQueries({ queryKey: ["user"] });
  }

  // Update session in cache
  updateSession(updates: Partial<Session>): void {
    const currentSession = this.queryClient.getQueryData<Session>(["session"]);
    if (currentSession) {
      const updatedSession = { ...currentSession, ...updates };
      this.queryClient.setQueryData(["session"], updatedSession);
    }
  }

  // Update user in cache
  updateUser(updates: Partial<User>): void {
    const currentUser = this.queryClient.getQueryData<User>(["user"]);
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      this.queryClient.setQueryData(["user"], updatedUser);
    }
  }

  // Check if session is cached
  hasSession(): boolean {
    return this.queryClient.getQueryData(["session"]) !== undefined;
  }

  // ===== EXISTING PIN CACHE METHODS =====

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
    const scale = Math.pow(2, Math.max(0, zoom - 8));

    // Calculate tile boundaries
    const minTileX = Math.floor(bounds.minLng * scale);
    const maxTileX = Math.floor(bounds.maxLng * scale);
    const minTileY = Math.floor(bounds.minLat * scale);
    const maxTileY = Math.floor(bounds.maxLat * scale);

    // Generate all tiles that intersect with the bounds
    for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
        tiles.add(`${zoom}_${tileX}_${tileY}`);
      }
    }

    return Array.from(tiles);
  }

  // Cache a pin using TanStack Query
  cachePin(pin: Pin): void {
    // Store individual pin in TanStack Query cache
    this.queryClient.setQueryData(["pin", pin.id], pin);

    // Add to spatial index for geographic queries
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
  }

  // Get pins for bounds using TanStack Query cache
  getPinsForBounds(bounds: MapBounds, zoom: number): Pin[] | null {
    // Use the same zoom levels that we cache pins at
    const cacheZoomLevels = [10, 12, 15];
    const allTiles = new Set<string>();

    // Get tiles for all cache zoom levels
    cacheZoomLevels.forEach((cacheZoom) => {
      const tiles = this.getTilesForBounds(bounds, cacheZoom);
      tiles.forEach((tile) => allTiles.add(tile));
    });

    const tiles = Array.from(allTiles);
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

    // Get pins from TanStack Query cache
    const pins: Pin[] = [];

    pinIds.forEach((pinId) => {
      const cachedPin = this.queryClient.getQueryData<Pin>(["pin", pinId]);
      if (cachedPin) {
        // Check if pin is actually in bounds
        const [lng, lat] = cachedPin.location.coordinates;
        if (
          lat >= bounds.minLat &&
          lat <= bounds.maxLat &&
          lng >= bounds.minLng &&
          lng <= bounds.maxLng
        ) {
          pins.push(cachedPin);
          this.hitCount++;
        }
      } else {
        console.log("⚠️ Pin not found in TanStack Query cache:", pinId);
      }
    });

    return pins.length > 0 ? pins : null;
  }

  // Cache multiple pins from API response
  cachePinsFromBounds(bounds: MapBounds, zoom: number, pins: Pin[]): void {
    pins.forEach((pin) => this.cachePin(pin));
  }

  // Update pin in TanStack Query cache
  updatePinInCache(pinId: string, updates: Partial<Pin>): void {
    const cachedPin = this.queryClient.getQueryData<Pin>(["pin", pinId]);
    if (cachedPin) {
      const updatedPin = { ...cachedPin, ...updates };
      this.queryClient.setQueryData(["pin", pinId], updatedPin);
    }
  }

  // Remove pin from cache
  removePinFromCache(pinId: string): void {
    this.deletePin(pinId);
  }

  // Update comment count for a pin
  updateCommentCountInCache(pinId: string, delta: number): void {
    const cachedPin = this.queryClient.getQueryData<Pin>(["pin", pinId]);
    if (cachedPin) {
      const currentCount = cachedPin.comments_count || 0;
      const updatedPin = {
        ...cachedPin,
        comments_count: Math.max(0, currentCount + delta),
        updated_at: new Date().toISOString(),
      };
      this.queryClient.setQueryData(["pin", pinId], updatedPin);
    }
  }

  // Invalidate cache entries that contain a specific pin
  invalidateRelatedAreas(pinId: string): void {
    this.deletePin(pinId);
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
    // Use the same zoom levels that we cache pins at
    const cacheZoomLevels = [10, 12, 15];
    const allTiles = new Set<string>();

    // Get tiles for all cache zoom levels
    cacheZoomLevels.forEach((cacheZoom) => {
      const tiles = this.getTilesForBounds(bounds, cacheZoom);
      tiles.forEach((tile) => allTiles.add(tile));
    });

    const tiles = Array.from(allTiles);
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
      const cachedPin = this.queryClient.getQueryData<Pin>(["pin", pinId]);
      if (cachedPin) {
        const [lng, lat] = cachedPin.location.coordinates;
        if (
          lat >= bounds.minLat &&
          lat <= bounds.maxLat &&
          lng >= bounds.minLng &&
          lng <= bounds.maxLng
        ) {
          this.deletePin(pinId);
        }
      }
    });
  }

  // Remove pin from TanStack Query cache and spatial index
  private removePin(pinId: string): void {
    const cachedPin = this.queryClient.getQueryData<Pin>(["pin", pinId]);
    if (!cachedPin) return;

    // Remove from TanStack Query cache
    this.queryClient.removeQueries({ queryKey: ["pin", pinId] });

    // Remove from spatial index
    const [lng, lat] = cachedPin.location.coordinates;
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
    this.updatePinInCache(pinId, updates);
  }

  // Delete pin from cache
  deletePin(pinId: string): void {
    this.removePin(pinId);
  }

  // Clear all cache
  clear(): void {
    // Clear all pin queries from TanStack Query
    this.queryClient.removeQueries({ queryKey: ["pin"] });
    // Clear session cache
    this.clearSession();
    this.spatialIndex = {};
    this.hitCount = 0;
    this.sessionHitCount = 0;
  }

  // Alias for clear
  clearAll(): void {
    this.clear();
  }

  // Get cache stats
  getStats(): CacheStats {
    // Get all pin queries from TanStack Query
    const queries = this.queryClient.getQueryCache().getAll();
    const pinQueries = queries.filter((q) => q.queryKey[0] === "pin");

    return {
      totalPins: pinQueries.length,
      totalTiles: Object.keys(this.spatialIndex).length,
      totalHits: this.hitCount,
      sessionCacheHits: this.sessionHitCount,
      memoryUsage: pinQueries.reduce((size, query) => {
        return (
          size +
          (query.state.data ? JSON.stringify(query.state.data).length : 0)
        );
      }, 0),
    };
  }
}
