import { Comment, MapBounds, Pin } from "@/types";
import { EnhancedCacheManager } from "./enhanced-cache-manager";
import { IntegratedStateManager } from "./integrated-state-manager";
import { OptimisticStateManager } from "./optimistic-state-manager";

// Simple validation function for the integrated state manager
export function validateIntegratedState(): boolean {
  console.log("🧪 Validating Integrated State Manager...");

  try {
    // Create managers
    const cacheManager = new EnhancedCacheManager({
      enablePersistence: false,
      enableDebug: true,
      maxEntries: 5,
    });

    const optimisticManager = new OptimisticStateManager();

    const integratedManager = new IntegratedStateManager(
      cacheManager,
      optimisticManager,
      {
        enableDebugMode: true,
        enablePerformanceMonitoring: true,
      }
    );

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
    ];

    const mockComment: Comment = {
      id: "comment1",
      pin_id: "pin1",
      user_id: "user1",
      text: "Test comment",
      is_first_comment: false,
      created_at: "2024-01-01T00:00:00Z",
      users: {
        display_name: "Test User",
      },
      vote_count: 0,
      user_vote: 0,
      comment_votes: [],
    };

    // Test 1: Cache integration
    console.log("✅ Test 1: Cache integration");

    // Load pins with cache (should be empty initially)
    const cachedPins = integratedManager.loadPinsWithCache(mockBounds, 10);
    if ((await cachedPins).length !== 0) {
      throw new Error("Initial cache should be empty");
    }

    // Set pins in cache
    integratedManager.setPinsInCache(mockBounds, 10, mockPins);

    // Load again (should hit cache)
    const cachedPinsSecond = await integratedManager.loadPinsWithCache(
      mockBounds,
      10
    );
    if (cachedPinsSecond.length !== 1) {
      throw new Error("Cache should return stored pins");
    }
    console.log("   ✓ Cache integration working");

    // Test 2: Optimistic comment integration
    console.log("✅ Test 2: Optimistic comment integration");

    const tempId = await integratedManager.addCommentWithCacheUpdate(
      "pin1",
      "Test comment",
      "user1",
      "Test User"
    );

    if (!tempId || !tempId.startsWith("temp-")) {
      throw new Error("Optimistic comment should return temp ID");
    }

    // Check optimistic comments for pin
    const optimisticComments =
      integratedManager.getOptimisticCommentsForPin("pin1");
    if (optimisticComments.length !== 1) {
      throw new Error("Should have one optimistic comment");
    }
    console.log("   ✓ Optimistic comment integration working");

    // Test 3: Comment confirmation with cache
    console.log("✅ Test 3: Comment confirmation with cache");

    const confirmedComment = integratedManager.confirmCommentWithCache(
      tempId,
      mockComment
    );
    if (confirmedComment.id !== "comment1") {
      throw new Error("Comment confirmation failed");
    }

    // Check that optimistic comment is removed
    const optimisticCommentsAfter =
      integratedManager.getOptimisticCommentsForPin("pin1");
    if (optimisticCommentsAfter.length !== 0) {
      throw new Error(
        "Optimistic comment should be removed after confirmation"
      );
    }
    console.log("   ✓ Comment confirmation working");

    // Test 4: Vote integration
    console.log("✅ Test 4: Vote integration");

    integratedManager.voteCommentWithCache("comment1", 1, "user1");

    // Check that vote is pending
    const pendingVotes = optimisticManager.getPendingVotes();
    if (!pendingVotes.has("comment1")) {
      throw new Error("Vote should be pending");
    }

    // Confirm vote
    integratedManager.confirmVoteWithCache("comment1", {
      commentId: "comment1",
      likeCount: 1,
      dislikeCount: 0,
      userVote: 1,
      netScore: 1,
    });

    // Check that vote is no longer pending
    const pendingVotesAfter = optimisticManager.getPendingVotes();
    if (pendingVotesAfter.has("comment1")) {
      throw new Error("Vote should not be pending after confirmation");
    }
    console.log("   ✓ Vote integration working");

    // Test 5: Enhanced comments
    console.log("✅ Test 5: Enhanced comments");

    const enhancedComments = integratedManager.getEnhancedComments([
      mockComment,
    ]);
    if (enhancedComments.length !== 1) {
      throw new Error("Should return enhanced comments");
    }

    const enhanced = enhancedComments[0];
    if (
      typeof enhanced.netScore !== "number" ||
      typeof enhanced.likeCount !== "number"
    ) {
      throw new Error("Enhanced comment should have calculated fields");
    }
    console.log("   ✓ Enhanced comments working");

    // Test 6: Pin operations with cache
    console.log("✅ Test 6: Pin operations with cache");

    const newPin: Pin = {
      id: "pin2",
      user_id: "user2",
      name: "New Pin",
      location: {
        type: "Point",
        coordinates: [28.6, 40.6],
      },
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      comments_count: 0,
    };

    integratedManager.createPinWithCache(newPin);

    // Update pin
    integratedManager.updatePinWithCache("pin1", { name: "Updated Pin Name" });

    // Delete pin
    integratedManager.deletePinWithCache("pin2");

    console.log("   ✓ Pin operations working");

    // Test 7: Debug info and statistics
    console.log("✅ Test 7: Debug info and statistics");

    const debugInfo = integratedManager.getDebugInfo();

    if (
      !debugInfo.cacheStats ||
      !debugInfo.optimisticStats ||
      !debugInfo.integrationStats
    ) {
      throw new Error("Debug info should contain all stats");
    }

    console.log("   ✓ Debug info working");
    console.log(`   📊 Cache entries: ${debugInfo.cacheStats.totalEntries}`);
    console.log(
      `   📊 Pending operations: ${
        debugInfo.optimisticStats.pendingComments +
        debugInfo.optimisticStats.pendingVotes
      }`
    );

    // Test 8: Configuration management
    console.log("✅ Test 8: Configuration management");

    const initialConfig = integratedManager.getConfig();
    if (
      !initialConfig.cacheWarming ||
      typeof initialConfig.enableDebugMode !== "boolean"
    ) {
      throw new Error("Configuration should be properly structured");
    }

    integratedManager.updateConfig({
      cacheWarming: { ...initialConfig.cacheWarming, enabled: false },
    });

    const updatedConfig = integratedManager.getConfig();
    if (updatedConfig.cacheWarming.enabled !== false) {
      throw new Error("Configuration update failed");
    }
    console.log("   ✓ Configuration management working");

    // Test 9: Rollback operations
    console.log("✅ Test 9: Rollback operations");

    const tempId2 = await integratedManager.addCommentWithCacheUpdate(
      "pin1",
      "Another test comment",
      "user1",
      "Test User"
    );

    // Rollback the comment
    integratedManager.rollbackCommentWithCache(tempId2, "pin1");

    // Check that comment is removed
    const optimisticCommentsRollback =
      integratedManager.getOptimisticCommentsForPin("pin1");
    if (optimisticCommentsRollback.length !== 0) {
      throw new Error("Rollback should remove optimistic comment");
    }
    console.log("   ✓ Rollback operations working");

    // Test 10: Clear all functionality
    console.log("✅ Test 10: Clear all functionality");

    integratedManager.clearAll();

    const debugInfoAfterClear = integratedManager.getDebugInfo();
    if (debugInfoAfterClear.cacheStats.totalEntries !== 0) {
      throw new Error("Clear all should remove all cache entries");
    }
    console.log("   ✓ Clear all functionality working");

    // Cleanup
    integratedManager.destroy();

    console.log("🎉 All Integrated State Manager validations passed!");
    return true;
  } catch (error) {
    console.error("❌ Integrated State Manager validation failed:", error);
    return false;
  }
}

// Export for use in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as any).validateIntegratedState = validateIntegratedState;
}
