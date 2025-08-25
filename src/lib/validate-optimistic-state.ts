import type { Comment } from "@/types";
import { OptimisticStateManager } from "./optimistic-state-manager";

// Simple validation script for OptimisticStateManager
export function validateOptimisticStateManager(): boolean {
  console.log("🧪 Validating OptimisticStateManager...");

  try {
    const manager = new OptimisticStateManager();

    // Test 1: Add optimistic comment
    console.log("✅ Test 1: Adding optimistic comment");
    const tempId = manager.addCommentOptimistic(
      "pin-1",
      "Test comment",
      "user-1",
      "Test User"
    );

    if (!tempId.startsWith("temp-")) {
      throw new Error('Temp ID should start with "temp-"');
    }

    if (!manager.hasPendingComment(tempId)) {
      throw new Error("Should have pending comment");
    }

    // Test 2: Create optimistic comment object
    console.log("✅ Test 2: Creating optimistic comment object");
    const optimisticComment = manager.createOptimisticComment(
      tempId,
      "pin-1",
      "Test comment",
      "user-1",
      "Test User"
    );

    if (!optimisticComment.isOptimistic) {
      throw new Error("Comment should be marked as optimistic");
    }

    if (optimisticComment.tempId !== tempId) {
      throw new Error("Temp ID should match");
    }

    // Test 3: Add optimistic vote
    console.log("✅ Test 3: Adding optimistic vote");
    manager.voteOptimistic("comment-1", 1, "user-1");

    if (!manager.hasPendingVote("comment-1")) {
      throw new Error("Should have pending vote");
    }

    // Test 4: Calculate vote counts
    console.log("✅ Test 4: Calculating vote counts with optimistic updates");
    const comment: Comment = {
      id: "comment-1",
      pin_id: "pin-1",
      user_id: "user-1",
      text: "Test comment",
      is_first_comment: false,
      created_at: new Date().toISOString(),
      vote_count: 2,
      user_vote: 0,
      comment_votes: [
        { value: 1, user_id: "user-2" },
        { value: 1, user_id: "user-3" },
        { value: -1, user_id: "user-4" },
      ],
    };

    const counts = manager.calculateVoteCounts(comment);

    if (counts.likeCount !== 3) {
      // 2 existing + 1 optimistic
      throw new Error(`Expected 3 likes, got ${counts.likeCount}`);
    }

    if (counts.dislikeCount !== 1) {
      throw new Error(`Expected 1 dislike, got ${counts.dislikeCount}`);
    }

    if (counts.netScore !== 2) {
      throw new Error(`Expected net score 2, got ${counts.netScore}`);
    }

    if (counts.userVote !== 1) {
      throw new Error(`Expected user vote 1, got ${counts.userVote}`);
    }

    // Test 5: Confirm operations
    console.log("✅ Test 5: Confirming operations");
    const realComment: Comment = {
      id: "real-comment-1",
      pin_id: "pin-1",
      user_id: "user-1",
      text: "Test comment",
      is_first_comment: false,
      created_at: new Date().toISOString(),
      users: { display_name: "Test User" },
      vote_count: 0,
      user_vote: 0,
      comment_votes: [],
    };

    manager.confirmComment(tempId, realComment);

    if (manager.hasPendingComment(tempId)) {
      throw new Error("Should not have pending comment after confirmation");
    }

    const voteData = {
      commentId: "comment-1",
      likeCount: 3,
      dislikeCount: 1,
      userVote: 1,
      netScore: 2,
    };

    manager.confirmVote("comment-1", voteData);

    if (manager.hasPendingVote("comment-1")) {
      throw new Error("Should not have pending vote after confirmation");
    }

    // Test 6: Rollback operations
    console.log("✅ Test 6: Testing rollback operations");
    const tempId2 = manager.addCommentOptimistic(
      "pin-2",
      "Test comment 2",
      "user-1",
      "Test User"
    );

    manager.voteOptimistic("comment-2", -1, "user-1");

    manager.rollbackComment(tempId2);
    manager.rollbackVote("comment-2", 0);

    if (manager.hasPendingComment(tempId2)) {
      throw new Error("Should not have pending comment after rollback");
    }

    if (manager.hasPendingVote("comment-2")) {
      throw new Error("Should not have pending vote after rollback");
    }

    // Test 7: Clear all operations
    console.log("✅ Test 7: Clearing all operations");
    manager.addCommentOptimistic(
      "pin-3",
      "Test comment 3",
      "user-1",
      "Test User"
    );
    manager.voteOptimistic("comment-3", 1, "user-1");

    manager.clearAllPendingOperations();

    if (manager.getPendingComments().size !== 0) {
      throw new Error("Should have no pending comments after clear");
    }

    if (manager.getPendingVotes().size !== 0) {
      throw new Error("Should have no pending votes after clear");
    }

    // Cleanup
    manager.destroy();

    console.log(
      "🎉 All tests passed! OptimisticStateManager is working correctly."
    );
    return true;
  } catch (error) {
    console.error("❌ Validation failed:", error);
    return false;
  }
}

// Run validation if this file is executed directly
if (typeof window !== "undefined") {
  validateOptimisticStateManager();
}
