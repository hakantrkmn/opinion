import { MapBounds, Pin } from "@/types";
import { SimpleMapCache } from "@/utils/mapCache";

// Enhanced cache entry with additional metadata
interface EnhancedCacheEntry {
  bounds: MapBounds;
  pins: Pin[];
  timestamp: number;
  zoom: number;
  // Enhanced fields for LRU and performance
  lastAccessed: number;
  hitCount: number;
  priority: "high" | "medium" | "low";
}

// Cache statistics for monitoring
interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

// Configuration for cache behavior
interface CacheConfig {
  maxAge: number;
  maxEntries: number;
  persistenceKey: string;
  enablePersistence: boolean;
  enableDebug: boolean;
}

export class EnhancedCacheManager extends SimpleMapCache {
  private enhancedCache = new Map<string, EnhancedCacheEntry>();
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(config?: Partial<CacheConfig>) {
    super();

    this.config = {
      maxAge: 10 * 60 * 1000, // 10 minutes
      maxEntries: 50, // Maximum cache entries
      persistenceKey: "opinion_map_cache",
      enablePersistence: true,
      enableDebug: false,
      ...config,
    };

    this.stats = {
      totalEntries: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      memoryUsage: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now(),
    };

    // Load from localStorage on initialization
    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }

    // Set up periodic cleanup
    this.setupPeriodicCleanup();
  }

  // Enhanced get method with LRU tracking
  get(bounds: MapBounds, zoom: number): Pin[] | null {
    const key = this.getCacheKey(bounds, zoom);
    this.debugLog(
      `Cache GET attempt for key: ${key}, bounds: ${JSON.stringify(bounds)}`
    );
    const entry = this.enhancedCache.get(key);

    if (!entry) {
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.config.maxAge) {
      this.enhancedCache.delete(key);
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }

    // Update LRU metadata
    entry.lastAccessed = Date.now();
    entry.hitCount++;
    this.stats.totalHits++;
    this.updateHitRate();

    this.debugLog(`Cache hit for key: ${key}`);
    return entry.pins;
  }

  // Enhanced set method with LRU eviction
  set(bounds: MapBounds, zoom: number, pins: Pin[]): void {
    const key = this.getCacheKey(bounds, zoom);
    this.debugLog(
      `Cache SET for key: ${key}, pins: ${
        pins.length
      }, bounds: ${JSON.stringify(bounds)}`
    );
    const now = Date.now();

    // Check if we need to evict entries
    if (this.enhancedCache.size >= this.config.maxEntries) {
      this.evictLRU();
    }

    const entry: EnhancedCacheEntry = {
      bounds,
      pins,
      timestamp: now,
      zoom,
      lastAccessed: now,
      hitCount: 0,
      priority: this.calculatePriority(bounds, zoom),
    };

    this.enhancedCache.set(key, entry);
    this.stats.totalEntries = this.enhancedCache.size;
    this.stats.newestEntry = now;

    this.debugLog(`Cache set for key: ${key}, pins: ${pins.length}`);

    // Persist to localStorage if enabled
    if (this.config.enablePersistence) {
      this.schedulePeristence();
    }
  }

  // Granular update operations for pins
  updatePinInCache(pinId: string, updates: Partial<Pin>): void {
    let updated = false;

    for (const [key, entry] of this.enhancedCache.entries()) {
      const pinIndex = entry.pins.findIndex((pin) => pin.id === pinId);

      if (pinIndex !== -1) {
        // Create updated pin with new data
        entry.pins[pinIndex] = {
          ...entry.pins[pinIndex],
          ...updates,
          updated_at: new Date().toISOString(),
        };

        entry.lastAccessed = Date.now();
        updated = true;

        this.debugLog(`Updated pin ${pinId} in cache entry ${key}`);
      }
    }

    if (updated && this.config.enablePersistence) {
      this.schedulePeristence();
    }
  }

  // Remove pin from all cache entries
  removePinFromCache(pinId: string): void {
    let removed = false;

    for (const [key, entry] of this.enhancedCache.entries()) {
      const initialLength = entry.pins.length;
      entry.pins = entry.pins.filter((pin) => pin.id !== pinId);

      if (entry.pins.length !== initialLength) {
        entry.lastAccessed = Date.now();
        removed = true;

        this.debugLog(`Removed pin ${pinId} from cache entry ${key}`);
      }
    }

    if (removed && this.config.enablePersistence) {
      this.schedulePeristence();
    }
  }

  // Update comment count for a specific pin
  updateCommentCountInCache(pinId: string, delta: number): void {
    for (const [key, entry] of this.enhancedCache.entries()) {
      const pinIndex = entry.pins.findIndex((pin) => pin.id === pinId);

      if (pinIndex !== -1) {
        const currentCount = entry.pins[pinIndex].comments_count || 0;
        entry.pins[pinIndex] = {
          ...entry.pins[pinIndex],
          comments_count: Math.max(0, currentCount + delta),
          updated_at: new Date().toISOString(),
        };

        entry.lastAccessed = Date.now();
        this.debugLog(
          `Updated comment count for pin ${pinId} by ${delta} in cache entry ${key}`
        );
      }
    }

    if (this.config.enablePersistence) {
      this.schedulePeristence();
    }
  }

  // Cache invalidation strategies
  invalidateRelatedAreas(pinId: string): void {
    // Find and invalidate cache entries that contain this pin
    const keysToInvalidate: string[] = [];

    for (const [key, entry] of this.enhancedCache.entries()) {
      if (entry.pins.some((pin) => pin.id === pinId)) {
        keysToInvalidate.push(key);
      }
    }

    keysToInvalidate.forEach((key) => {
      this.enhancedCache.delete(key);
      this.debugLog(`Invalidated cache entry: ${key}`);
    });

    this.stats.totalEntries = this.enhancedCache.size;
  }

  // Schedule refresh for specific bounds
  scheduleRefresh(bounds: MapBounds, delay: number): void {
    setTimeout(() => {
      const keys = this.getKeysForBounds(bounds);
      keys.forEach((key) => {
        this.enhancedCache.delete(key);
        this.debugLog(`Scheduled refresh completed for key: ${key}`);
      });
      this.stats.totalEntries = this.enhancedCache.size;
    }, delay);
  }

  // LRU eviction implementation
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    // Find the least recently used entry with lowest priority
    for (const [key, entry] of this.enhancedCache.entries()) {
      const score = this.calculateEvictionScore(entry);
      if (score < oldestTime) {
        oldestTime = score;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.enhancedCache.delete(oldestKey);
      this.debugLog(`Evicted LRU entry: ${oldestKey}`);
    }
  }

  // Calculate eviction score (lower = more likely to be evicted)
  private calculateEvictionScore(entry: EnhancedCacheEntry): number {
    const ageWeight = 0.4;
    const accessWeight = 0.3;
    const hitWeight = 0.2;
    const priorityWeight = 0.1;

    const age = Date.now() - entry.lastAccessed;
    const accessRecency = Date.now() - entry.lastAccessed;
    const hitCount = entry.hitCount;
    const priorityScore =
      entry.priority === "high" ? 3 : entry.priority === "medium" ? 2 : 1;

    // Lower score = higher eviction priority
    return (
      age * ageWeight +
      accessRecency * accessWeight -
      hitCount * hitWeight -
      priorityScore * priorityWeight
    );
  }

  // Calculate priority based on zoom level and bounds size
  private calculatePriority(
    bounds: MapBounds,
    zoom: number
  ): "high" | "medium" | "low" {
    // Higher zoom levels (more detailed) get higher priority
    if (zoom >= 15) return "high";
    if (zoom >= 12) return "medium";
    return "low";
  }

  // Get cache keys that intersect with given bounds
  private getKeysForBounds(bounds: MapBounds): string[] {
    const keys: string[] = [];

    for (const [key, entry] of this.enhancedCache.entries()) {
      if (this.boundsIntersect(bounds, entry.bounds)) {
        keys.push(key);
      }
    }

    return keys;
  }

  // Check if two bounds intersect
  private boundsIntersect(bounds1: MapBounds, bounds2: MapBounds): boolean {
    return !(
      bounds1.maxLat < bounds2.minLat ||
      bounds1.minLat > bounds2.maxLat ||
      bounds1.maxLng < bounds2.minLng ||
      bounds1.minLng > bounds2.maxLng
    );
  }

  // Persistence to localStorage
  persistToStorage(): void {
    if (!this.config.enablePersistence || typeof window === "undefined") return;

    try {
      const cacheData = {
        entries: Array.from(this.enhancedCache.entries()),
        stats: this.stats,
        timestamp: Date.now(),
      };

      localStorage.setItem(
        this.config.persistenceKey,
        JSON.stringify(cacheData)
      );

      this.debugLog(
        `Persisted ${this.enhancedCache.size} cache entries to localStorage`
      );
    } catch (error) {
      console.error("Failed to persist cache to localStorage:", error);
    }
  }

  // Load from localStorage
  loadFromStorage(): void {
    if (!this.config.enablePersistence || typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(this.config.persistenceKey);
      if (!stored) return;

      const cacheData = JSON.parse(stored);
      const now = Date.now();

      // Only load if data is not too old (1 hour)
      if (now - cacheData.timestamp > 60 * 60 * 1000) {
        localStorage.removeItem(this.config.persistenceKey);
        return;
      }

      // Restore cache entries
      this.enhancedCache.clear();
      for (const [key, entry] of cacheData.entries) {
        // Only restore non-expired entries
        if (now - entry.timestamp <= this.config.maxAge) {
          this.enhancedCache.set(key, entry);
        }
      }

      // Restore stats
      this.stats = { ...this.stats, ...cacheData.stats };
      this.stats.totalEntries = this.enhancedCache.size;

      this.debugLog(
        `Loaded ${this.enhancedCache.size} cache entries from localStorage`
      );
    } catch (error) {
      console.error("Failed to load cache from localStorage:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem(this.config.persistenceKey);
      }
    }
  }

  // Scheduled persistence to avoid too frequent writes
  private persistenceTimeout: NodeJS.Timeout | null = null;

  private schedulePeristence(): void {
    if (this.persistenceTimeout) {
      clearTimeout(this.persistenceTimeout);
    }

    this.persistenceTimeout = setTimeout(() => {
      this.persistToStorage();
      this.persistenceTimeout = null;
    }, 1000); // Debounce persistence writes
  }

  // Clear all cache
  clear(): void {
    super.clear();
    this.enhancedCache.clear();
    this.stats.totalEntries = 0;

    if (this.config.enablePersistence && typeof window !== "undefined") {
      localStorage.removeItem(this.config.persistenceKey);
    }

    this.debugLog("Cache cleared completely");
  }

  // Clear specific area
  clearArea(bounds: MapBounds, zoom: number): void {
    super.clearArea(bounds, zoom);

    const key = this.getCacheKey(bounds, zoom);
    this.enhancedCache.delete(key);
    this.stats.totalEntries = this.enhancedCache.size;

    this.debugLog(`Cleared cache area: ${key}`);
  }

  // Get cache statistics for monitoring
  getStats(): CacheStats {
    this.updateMemoryUsage();
    return { ...this.stats };
  }

  // Update hit rate calculation
  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  // Estimate memory usage
  private updateMemoryUsage(): void {
    let totalSize = 0;

    for (const entry of this.enhancedCache.values()) {
      // Rough estimation of memory usage
      totalSize += JSON.stringify(entry).length * 2; // UTF-16 characters
    }

    this.stats.memoryUsage = totalSize;
  }

  // Setup periodic cleanup of expired entries
  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Clean up expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.enhancedCache.entries()) {
      if (now - entry.timestamp > this.config.maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.enhancedCache.delete(key);
    });

    if (keysToDelete.length > 0) {
      this.stats.totalEntries = this.enhancedCache.size;
      this.debugLog(`Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  // Debug logging
  private debugLog(message: string): void {
    if (this.config.enableDebug) {
      console.log(`[EnhancedCacheManager] ${message}`);
    }
  }

  // Enable/disable debug mode
  setDebugMode(enabled: boolean): void {
    this.config.enableDebug = enabled;
  }

  // Get cache configuration
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  // Update cache configuration
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const enhancedCacheManager = new EnhancedCacheManager({
  enableDebug: process.env.NODE_ENV === "development",
});
