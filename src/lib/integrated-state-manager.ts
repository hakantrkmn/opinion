import { Comment, EnhancedComment, MapBounds, Pin } from "@/types";
import { EnhancedCacheManager } from "./enhanced-cache-manager";
import {
  OptimisticStateManager,
  getOptimisticStateManager,
} from "./optimistic-state-manager";

// Cache warming strategies
export interface CacheWarmingConfig {
  enabled: boolean;
  preloadRadius: number; // In degrees
  preloadZoomLevels: number[];
  maxPreloadEntries: number;
}

// Cache debugging and monitoring
export interface CacheDebugInfo {
  cacheStats: any;
  optimisticStats: {
    pendingComments: number;
    pendingVotes: number;
    rollbackQueueSize: number;
  };
  integrationStats: {
    cacheHitRate: number;
    optimisticUpdateRate: number;
    lastCacheInvalidation: number;
    lastCacheWarming: number;
  };
}

// Integration configuration
export interface IntegrationConfig {
  cacheWarming: CacheWarmingConfig;
  enableDebugMode: boolean;
  enablePerformanceMonitoring: boolean;
  cacheInvalidationDelay: number; // Debounce cache invalidation
}

export class IntegratedStateManager {
  private cacheManager: EnhancedCacheManager;
  private optimisticManager: OptimisticStateManager;
  private config: IntegrationConfig;
  private debugInfo: CacheDebugInfo;
  private invalidationTimeout: NodeJS.Timeout | null = null;
  private warmingTimeout: NodeJS.Timeout | null = null;

  constructor(
    cacheManager?: EnhancedCacheManager,
    optimisticManager?: OptimisticStateManager,
    config?: Partial<IntegrationConfig>
  ) {
    this.cacheManager =
      cacheManager ||
      new EnhancedCacheManager({
        enableDebug: process.env.NODE_ENV === "development",
      });

    this.optimisticManager = optimisticManager || getOptimisticStateManager();

    this.config = {
      cacheWarming: {
        enabled: true,
        preloadRadius: 0.5, // 0.5 degrees around current view
        preloadZoomLevels: [10, 12, 14],
        maxPreloadEntries: 10,
      },
      enableDebugMode: process.env.NODE_ENV === "development",
      enablePerformanceMonitoring: true,
      cacheInvalidationDelay: 500, // 500ms debounce
      ...config,
    };

    this.debugInfo = {
      cacheStats: {},
      optimisticStats: {
        pendingComments: 0,
        pendingVotes: 0,
        rollbackQueueSize: 0,
      },
      integrationStats: {
        cacheHitRate: 0,
        optimisticUpdateRate: 0,
        lastCacheInvalidation: 0,
        lastCacheWarming: 0,
      },
    };

    // Subscribe to optimistic state changes for cache invalidation
    this.optimisticManager.subscribe(() => {
      this.updateOptimisticStats();
    });

    // Initial stats update
    this.updateStats();
  }

  // Enhanced pin loading with cache integration
  async loadPinsWithCache(
    bounds: MapBounds,
    zoom: number
  ): Promise<Pin[] | null> {
    this.debugLog("Loading pins with cache integration", { bounds, zoom });

    // Try to get from cache first
    const cachedPins = this.cacheManager.get(bounds, zoom);

    if (cachedPins) {
      this.debugLog("Cache hit - returning cached pins", {
        count: cachedPins.length,
      });
      this.updateIntegrationStats("cacheHit");

      // Schedule cache warming for adjacent areas
      this.scheduleCacheWarming(bounds, zoom);

      return cachedPins;
    }

    this.debugLog("Cache miss - will need to fetch from API");
    this.updateIntegrationStats("cacheMiss");

    // Cache miss - return null to indicate cache miss
    return null;
  }

  // Set pins in cache after API fetch
  setPinsInCache(bounds: MapBounds, zoom: number, pins: Pin[]): void {
    this.debugLog("Setting pins in cache", {
      bounds,
      zoom,
      count: pins.length,
    });
    this.cacheManager.set(bounds, zoom, pins);
    this.updateStats();
  }

  // Enhanced comment operations with cache integration
  async addCommentWithCacheUpdate(
    pinId: string,
    text: string,
    userId: string,
    userDisplayName: string
  ): Promise<string> {
    this.debugLog("Adding comment with cache update", { pinId, userId });

    // Add optimistic comment
    const tempId = this.optimisticManager.addCommentOptimistic(
      pinId,
      text,
      userId,
      userDisplayName
    );

    // Update cache - increment comment count for the pin
    this.scheduleInvalidation(() => {
      this.cacheManager.updateCommentCountInCache(pinId, 1);
      this.debugLog("Updated comment count in cache", { pinId, delta: 1 });
    });

    this.updateIntegrationStats("optimisticUpdate");
    return tempId;
  }

  // Confirm comment with cache update
  confirmCommentWithCache(tempId: string, realComment: Comment): Comment {
    this.debugLog("Confirming comment with cache", {
      tempId,
      commentId: realComment.id,
    });

    const result = this.optimisticManager.confirmComment(tempId, realComment);

    // No additional cache update needed - comment count was already updated optimistically
    this.updateIntegrationStats("optimisticConfirm");

    return result;
  }

  // Rollback comment with cache update
  rollbackCommentWithCache(tempId: string, pinId: string): void {
    this.debugLog("Rolling back comment with cache", { tempId, pinId });

    this.optimisticManager.rollbackComment(tempId);

    // Rollback cache - decrement comment count for the pin
    this.scheduleInvalidation(() => {
      this.cacheManager.updateCommentCountInCache(pinId, -1);
      this.debugLog("Rolled back comment count in cache", { pinId, delta: -1 });
    });

    this.updateIntegrationStats("optimisticRollback");
  }

  // Vote operations with cache integration
  voteCommentWithCache(commentId: string, value: number, userId: string): void {
    this.debugLog("Voting on comment with cache", { commentId, value, userId });

    this.optimisticManager.voteOptimistic(commentId, value, userId);

    // Votes don't affect cache directly since they're calculated dynamically
    // No cache invalidation needed for votes

    this.updateIntegrationStats("optimisticUpdate");
  }

  // Confirm vote (no cache update needed)
  confirmVoteWithCache(commentId: string, voteData: any): void {
    this.debugLog("Confirming vote", { commentId });

    this.optimisticManager.confirmVote(commentId, voteData);
    this.updateIntegrationStats("optimisticConfirm");
  }

  // Rollback vote (no cache update needed)
  rollbackVoteWithCache(commentId: string, previousVote: number): void {
    this.debugLog("Rolling back vote", { commentId, previousVote });

    this.optimisticManager.rollbackVote(commentId, previousVote);
    this.updateIntegrationStats("optimisticRollback");
  }

  // Pin operations with cache integration
  createPinWithCache(pin: Pin): void {
    this.debugLog("Creating pin with cache", { pinId: pin.id });

    // Add pin to all relevant cache entries
    // We need to find cache entries that would contain this pin's location
    const pinLat = pin.location.coordinates[1];
    const pinLng = pin.location.coordinates[0];

    // Invalidate cache entries that might contain this pin
    this.scheduleInvalidation(() => {
      // For now, we'll use a simple approach and invalidate related areas
      // In a more sophisticated implementation, we could add the pin to specific cache entries
      const bounds = {
        minLat: pinLat - 0.1,
        maxLat: pinLat + 0.1,
        minLng: pinLng - 0.1,
        maxLng: pinLng + 0.1,
      };

      // Clear cache entries that intersect with the pin's area
      this.cacheManager.invalidateRelatedAreas(pin.id);
      this.debugLog("Invalidated cache for new pin", { pinId: pin.id });
    });
  }

  // Delete pin with cache update
  deletePinWithCache(pinId: string): void {
    this.debugLog("Deleting pin with cache", { pinId });

    this.scheduleInvalidation(() => {
      this.cacheManager.removePinFromCache(pinId);
      this.debugLog("Removed pin from cache", { pinId });
    });
  }

  // Delete comment with cleanup and cache integration
  async deleteCommentWithCleanup(
    commentId: string,
    pinId: string
  ): Promise<{ success: boolean; pinDeleted: boolean }> {
    this.debugLog("Deleting comment with cleanup", { commentId, pinId });

    // First, decrement comment count optimistically
    this.scheduleInvalidation(() => {
      this.cacheManager.updateCommentCountInCache(pinId, -1);
      this.debugLog("Decremented comment count in cache", { pinId, delta: -1 });
    });

    // The actual deletion will be handled by the caller using pinService.deleteCommentWithCleanup
    // This method just handles the cache updates

    return { success: true, pinDeleted: false };
  }

  // Handle pin deletion from cleanup service
  handlePinDeletionFromCleanup(pinId: string): void {
    this.debugLog("Handling pin deletion from cleanup service", { pinId });

    // Remove pin from cache immediately
    this.scheduleInvalidation(() => {
      this.cacheManager.removePinFromCache(pinId);
      this.debugLog("Removed pin from cache after cleanup", { pinId });
    });
  }

  // Update pin with cache update
  updatePinWithCache(pinId: string, updates: Partial<Pin>): void {
    this.debugLog("Updating pin with cache", { pinId, updates });

    this.scheduleInvalidation(() => {
      this.cacheManager.updatePinInCache(pinId, updates);
      this.debugLog("Updated pin in cache", { pinId });
    });
  }

  // Cache warming strategies
  private scheduleCacheWarming(
    currentBounds: MapBounds,
    currentZoom: number
  ): void {
    if (!this.config.cacheWarming.enabled) return;

    // Clear existing warming timeout
    if (this.warmingTimeout) {
      clearTimeout(this.warmingTimeout);
    }

    this.warmingTimeout = setTimeout(() => {
      this.performCacheWarming(currentBounds, currentZoom);
    }, 1000); // Delay warming to avoid interfering with current operations
  }

  private performCacheWarming(bounds: MapBounds, zoom: number): void {
    this.debugLog("Performing cache warming", { bounds, zoom });

    const { preloadRadius, preloadZoomLevels, maxPreloadEntries } =
      this.config.cacheWarming;

    // Generate adjacent bounds for preloading
    const adjacentBounds = this.generateAdjacentBounds(bounds, preloadRadius);

    let preloadCount = 0;

    for (const adjacentBound of adjacentBounds) {
      if (preloadCount >= maxPreloadEntries) break;

      for (const preloadZoom of preloadZoomLevels) {
        if (preloadCount >= maxPreloadEntries) break;

        // Check if this area is already cached
        const cached = this.cacheManager.get(adjacentBound, preloadZoom);
        if (!cached) {
          // Mark this area for preloading (caller should implement the actual fetching)
          this.debugLog("Area marked for preloading", {
            bounds: adjacentBound,
            zoom: preloadZoom,
          });
          preloadCount++;
        }
      }
    }

    this.debugInfo.integrationStats.lastCacheWarming = Date.now();
  }

  private generateAdjacentBounds(
    bounds: MapBounds,
    radius: number
  ): MapBounds[] {
    const adjacent: MapBounds[] = [];

    // Generate 8 adjacent areas (N, NE, E, SE, S, SW, W, NW)
    const offsets = [
      { lat: radius, lng: 0 }, // N
      { lat: radius, lng: radius }, // NE
      { lat: 0, lng: radius }, // E
      { lat: -radius, lng: radius }, // SE
      { lat: -radius, lng: 0 }, // S
      { lat: -radius, lng: -radius }, // SW
      { lat: 0, lng: -radius }, // W
      { lat: radius, lng: -radius }, // NW
    ];

    for (const offset of offsets) {
      adjacent.push({
        minLat: bounds.minLat + offset.lat,
        maxLat: bounds.maxLat + offset.lat,
        minLng: bounds.minLng + offset.lng,
        maxLng: bounds.maxLng + offset.lng,
      });
    }

    return adjacent;
  }

  // Debounced cache invalidation
  private scheduleInvalidation(invalidationFn: () => void): void {
    if (this.invalidationTimeout) {
      clearTimeout(this.invalidationTimeout);
    }

    this.invalidationTimeout = setTimeout(() => {
      invalidationFn();
      this.debugInfo.integrationStats.lastCacheInvalidation = Date.now();
      this.updateStats();
    }, this.config.cacheInvalidationDelay);
  }

  // Statistics and monitoring
  private updateStats(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    this.debugInfo.cacheStats = this.cacheManager.getStats();
    this.updateOptimisticStats();
  }

  private updateOptimisticStats(): void {
    const state = this.optimisticManager.getState();
    this.debugInfo.optimisticStats = {
      pendingComments: state.pendingComments.size,
      pendingVotes: state.pendingVotes.size,
      rollbackQueueSize: state.rollbackQueue.length,
    };
  }

  private updateIntegrationStats(
    operation:
      | "cacheHit"
      | "cacheMiss"
      | "optimisticUpdate"
      | "optimisticConfirm"
      | "optimisticRollback"
  ): void {
    // Simple rate tracking (could be enhanced with more sophisticated metrics)
    const now = Date.now();

    switch (operation) {
      case "cacheHit":
      case "cacheMiss":
        // Cache hit rate is calculated by the cache manager
        break;
      case "optimisticUpdate":
      case "optimisticConfirm":
      case "optimisticRollback":
        // Track optimistic update rate
        this.debugInfo.integrationStats.optimisticUpdateRate = now;
        break;
    }
  }

  // Public API for accessing managers
  getCacheManager(): EnhancedCacheManager {
    return this.cacheManager;
  }

  getOptimisticManager(): OptimisticStateManager {
    return this.optimisticManager;
  }

  // Enhanced comment retrieval with optimistic state
  getEnhancedComments(comments: Comment[]): EnhancedComment[] {
    return comments.map((comment) => {
      const voteCounts = this.optimisticManager.calculateVoteCounts(comment);

      return {
        ...comment,
        netScore: voteCounts.netScore,
        likeCount: voteCounts.likeCount,
        dislikeCount: voteCounts.dislikeCount,
        user_vote: voteCounts.userVote,
        isOptimistic: false,
      };
    });
  }

  // Get optimistic comments for a specific pin
  getOptimisticCommentsForPin(pinId: string): EnhancedComment[] {
    const pendingComments = this.optimisticManager.getPendingComments();
    const optimisticComments: EnhancedComment[] = [];

    for (const [tempId, pendingComment] of pendingComments) {
      if (pendingComment.pinId === pinId) {
        const optimisticComment =
          this.optimisticManager.createOptimisticComment(
            tempId,
            pendingComment.pinId,
            pendingComment.text,
            pendingComment.userId,
            pendingComment.userDisplayName
          );
        optimisticComments.push(optimisticComment);
      }
    }

    return optimisticComments;
  }

  // Cache debugging and monitoring
  getDebugInfo(): CacheDebugInfo {
    this.updateStats();
    return { ...this.debugInfo };
  }

  // Clear all caches and optimistic state
  clearAll(): void {
    this.debugLog("Clearing all caches and optimistic state");

    this.cacheManager.clear();
    this.optimisticManager.clearAllPendingOperations();
    this.updateStats();
  }

  // Clear cache for specific area
  clearCacheArea(bounds: MapBounds, zoom: number): void {
    this.debugLog(
      `Clearing cache area: ${JSON.stringify(bounds)}, zoom: ${zoom}`
    );
    this.cacheManager.clearArea(bounds, zoom);
    this.updateStats();
  }

  // Configuration management
  updateConfig(newConfig: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.debugLog("Updated integration config", this.config);
  }

  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  // Debug logging
  private debugLog(message: string, data?: any): void {
    if (this.config.enableDebugMode) {
      console.log(`[IntegratedStateManager] ${message}`, data || "");
    }
  }

  // Cleanup
  destroy(): void {
    if (this.invalidationTimeout) {
      clearTimeout(this.invalidationTimeout);
    }
    if (this.warmingTimeout) {
      clearTimeout(this.warmingTimeout);
    }

    // Note: We don't destroy the managers as they might be used elsewhere
    this.debugLog("IntegratedStateManager destroyed");
  }
}

// Singleton instance
let integratedStateManager: IntegratedStateManager | null = null;

export function getIntegratedStateManager(): IntegratedStateManager {
  if (!integratedStateManager) {
    integratedStateManager = new IntegratedStateManager();
  }
  return integratedStateManager;
}

// Cleanup function
export function destroyIntegratedStateManager(): void {
  if (integratedStateManager) {
    integratedStateManager.destroy();
    integratedStateManager = null;
  }
}
