import { MapBounds, Pin } from "@/types";
import { EnhancedCacheManager } from "./enhanced-cache-manager";

// Simple validation function for the enhanced cache manager
export function validateEnhancedCache(): boolean {
  console.log("🧪 Validating Enhanced Cache Manager...");

  try {
    // Create cache manager instance
    const cacheManager = new EnhancedCacheManager({
      enablePersistence: false, // Disable for validation
      enableDebug: true,
      maxEntries: 3,
    });

    // Test data
    const mockBounds: MapBounds = {
      minLat: 40.0,
      maxLat: 41.0,
      minLng: 28.0,
      maxLng: 29.0,
    };

    const mockPins: Pin[] = [
      {
        id: "pin1",
        user_id: "user1",
        name: "Test Pin 1",
        location: {
          type: "Point",
          coordinates: [28.5, 40.5],
        },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        comments_count: 5,
      },
      {
        id: "pin2",
        user_id: "user2",
        name: "Test Pin 2",
        location: {
          type: "Point",
          coordinates: [28.7, 40.7],
        },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        comments_count: 3,
      },
    ];

    // Test 1: Basic cache operations
    console.log("✅ Test 1: Basic cache operations");
    cacheManager.set(mockBounds, 10, mockPins);
    const retrieved = cacheManager.get(mockBounds, 10);

    if (!retrieved || retrieved.length !== 2) {
      throw new Error("Basic cache set/get failed");
    }
    console.log("   ✓ Cache set and get working");

    // Test 2: Cache miss
    console.log("✅ Test 2: Cache miss");
    const missResult = cacheManager.get({ ...mockBounds, minLat: 50 }, 10);
    if (missResult !== null) {
      throw new Error("Cache miss should return null");
    }
    console.log("   ✓ Cache miss working correctly");

    // Test 3: Pin updates
    console.log("✅ Test 3: Pin updates");
    cacheManager.updatePinInCache("pin1", { name: "Updated Pin Name" });
    const updatedPins = cacheManager.get(mockBounds, 10);
    const updatedPin = updatedPins?.find((p) => p.id === "pin1");

    if (!updatedPin || updatedPin.name !== "Updated Pin Name") {
      throw new Error("Pin update failed");
    }
    console.log("   ✓ Pin updates working");

    // Test 4: Comment count updates
    console.log("✅ Test 4: Comment count updates");
    cacheManager.updateCommentCountInCache("pin1", 2);
    const pinsWithUpdatedCount = cacheManager.get(mockBounds, 10);
    const pinWithUpdatedCount = pinsWithUpdatedCount?.find(
      (p) => p.id === "pin1"
    );

    if (!pinWithUpdatedCount || pinWithUpdatedCount.comments_count !== 7) {
      throw new Error("Comment count update failed");
    }
    console.log("   ✓ Comment count updates working");

    // Test 5: Pin removal
    console.log("✅ Test 5: Pin removal");
    cacheManager.removePinFromCache("pin2");
    const pinsAfterRemoval = cacheManager.get(mockBounds, 10);

    if (
      !pinsAfterRemoval ||
      pinsAfterRemoval.length !== 1 ||
      pinsAfterRemoval.find((p) => p.id === "pin2")
    ) {
      throw new Error("Pin removal failed");
    }
    console.log("   ✓ Pin removal working");

    // Test 6: Cache invalidation
    console.log("✅ Test 6: Cache invalidation");
    cacheManager.invalidateRelatedAreas("pin1");
    const invalidatedResult = cacheManager.get(mockBounds, 10);

    if (invalidatedResult !== null) {
      throw new Error("Cache invalidation failed");
    }
    console.log("   ✓ Cache invalidation working");

    // Test 7: Statistics
    console.log("✅ Test 7: Statistics");
    const stats = cacheManager.getStats();

    if (typeof stats.hitRate !== "number" || stats.totalEntries < 0) {
      throw new Error("Statistics validation failed");
    }
    console.log("   ✓ Statistics working");
    console.log(`   📊 Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log(`   📊 Total entries: ${stats.totalEntries}`);

    // Test 8: LRU eviction
    console.log("✅ Test 8: LRU eviction");
    // Fill cache beyond capacity
    for (let i = 0; i < 5; i++) {
      const bounds = {
        ...mockBounds,
        minLat: mockBounds.minLat + i,
        maxLat: mockBounds.maxLat + i,
      };
      cacheManager.set(bounds, 10, mockPins);
    }

    const finalStats = cacheManager.getStats();
    if (finalStats.totalEntries > 3) {
      throw new Error("LRU eviction not working - too many entries");
    }
    console.log("   ✓ LRU eviction working");
    console.log(`   📊 Final entries: ${finalStats.totalEntries}`);

    console.log("🎉 All Enhanced Cache Manager validations passed!");
    return true;
  } catch (error) {
    console.error("❌ Enhanced Cache Manager validation failed:", error);
    return false;
  }
}

// Export for use in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).validateEnhancedCache = validateEnhancedCache;
}
