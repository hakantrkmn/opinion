import type { Comment } from "@/types";

// Enhanced Comment interface for optimistic updates
export interface EnhancedComment extends Comment {
  // Optimistic update fields
  isOptimistic?: boolean;
  tempId?: string;

  // Calculated fields
  netScore: number;
  likeCount: number;
  dislikeCount: number;

  // UI state
  isVoting?: boolean;
  voteError?: string;
}

// Optimistic state interfaces
export interface PendingComment {
  tempId: string;
  pinId: string;
  text: string;
  userId: string;
  timestamp: number;
  userDisplayName: string;
}

export interface PendingVote {
  commentId: string;
  value: number;
  previousValue: number;
  userId: string;
  timestamp: number;
}

export interface RollbackAction {
  type: "comment" | "vote";
  id: string;
  data: PendingComment | { previousValue: number; newValue: number };
  timestamp: number;
}

export interface OptimisticState {
  pendingComments: Map<string, PendingComment>;
  pendingVotes: Map<string, PendingVote>;
  rollbackQueue: RollbackAction[];
}

export interface VoteData {
  commentId: string;
  likeCount: number;
  dislikeCount: number;
  userVote: number;
  netScore: number;
}

// Storage keys for persistence
const STORAGE_KEYS = {
  PENDING_COMMENTS: "optimistic_pending_comments",
  PENDING_VOTES: "optimistic_pending_votes",
  ROLLBACK_QUEUE: "optimistic_rollback_queue",
} as const;

// Cleanup timeout for old pending operations (5 minutes)
const CLEANUP_TIMEOUT = 5 * 60 * 1000;

export class OptimisticStateManager {
  private state: OptimisticState;
  private listeners: Set<() => void> = new Set();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      pendingComments: new Map(),
      pendingVotes: new Map(),
      rollbackQueue: [],
    };

    // Load persisted state
    this.loadFromStorage();

    // Start cleanup interval
    this.startCleanupInterval();
  }

  // Event listener management
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Temporary ID generation
  private generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Comment operations
  public addCommentOptimistic(
    pinId: string,
    text: string,
    userId: string,
    userDisplayName: string
  ): string {
    const tempId = this.generateTempId();
    const timestamp = Date.now();

    const pendingComment: PendingComment = {
      tempId,
      pinId,
      text,
      userId,
      timestamp,
      userDisplayName,
    };

    // Add to pending comments
    this.state.pendingComments.set(tempId, pendingComment);

    // Add to rollback queue
    this.state.rollbackQueue.push({
      type: "comment",
      id: tempId,
      data: pendingComment,
      timestamp,
    });

    // Persist state
    this.persistToStorage();
    this.notify();

    return tempId;
  }

  public confirmComment(tempId: string, realComment: Comment): Comment {
    // Remove from pending comments
    this.state.pendingComments.delete(tempId);

    // Remove from rollback queue
    this.state.rollbackQueue = this.state.rollbackQueue.filter(
      (action) => !(action.type === "comment" && action.id === tempId)
    );

    // Persist state
    this.persistToStorage();
    this.notify();

    // Return the real comment for UI integration
    return realComment;
  }

  public rollbackComment(tempId: string): void {
    // Remove from pending comments
    this.state.pendingComments.delete(tempId);

    // Remove from rollback queue
    this.state.rollbackQueue = this.state.rollbackQueue.filter(
      (action) => !(action.type === "comment" && action.id === tempId)
    );

    // Persist state
    this.persistToStorage();
    this.notify();
  }

  // Vote operations
  public voteOptimistic(
    commentId: string,
    value: number,
    userId: string
  ): void {
    const timestamp = Date.now();

    // Get previous vote if exists
    const existingVote = this.state.pendingVotes.get(commentId);
    const previousValue = existingVote?.value || 0;

    const pendingVote: PendingVote = {
      commentId,
      value,
      previousValue,
      userId,
      timestamp,
    };

    // Add to pending votes
    this.state.pendingVotes.set(commentId, pendingVote);

    // Add to rollback queue
    this.state.rollbackQueue.push({
      type: "vote",
      id: commentId,
      data: { previousValue, newValue: value },
      timestamp,
    });

    // Persist state
    this.persistToStorage();
    this.notify();
  }

  public confirmVote(commentId: string, _newVoteData: VoteData): void {
    // Remove from pending votes
    this.state.pendingVotes.delete(commentId);

    // Remove from rollback queue
    this.state.rollbackQueue = this.state.rollbackQueue.filter(
      (action) => !(action.type === "vote" && action.id === commentId)
    );

    // Persist state
    this.persistToStorage();
    this.notify();
  }

  public rollbackVote(commentId: string, _previousVote: number): void {
    // Remove from pending votes
    this.state.pendingVotes.delete(commentId);

    // Remove from rollback queue
    this.state.rollbackQueue = this.state.rollbackQueue.filter(
      (action) => !(action.type === "vote" && action.id === commentId)
    );

    // Persist state
    this.persistToStorage();
    this.notify();
  }

  // State getters
  public getPendingComments(): Map<string, PendingComment> {
    return new Map(this.state.pendingComments);
  }

  public getPendingVotes(): Map<string, PendingVote> {
    return new Map(this.state.pendingVotes);
  }

  public getPendingComment(tempId: string): PendingComment | undefined {
    return this.state.pendingComments.get(tempId);
  }

  public getPendingVote(commentId: string): PendingVote | undefined {
    return this.state.pendingVotes.get(commentId);
  }

  public hasPendingComment(tempId: string): boolean {
    return this.state.pendingComments.has(tempId);
  }

  public hasPendingVote(commentId: string): boolean {
    return this.state.pendingVotes.has(commentId);
  }

  // Enhanced comment creation with optimistic data
  public createOptimisticComment(
    tempId: string,
    pinId: string,
    text: string,
    userId: string,
    userDisplayName: string
  ): EnhancedComment {
    return {
      id: tempId,
      pin_id: pinId,
      user_id: userId,
      text,
      is_first_comment: false,
      created_at: new Date().toISOString(),
      users: {
        display_name: userDisplayName,
      },
      isOptimistic: true,
      tempId,
      netScore: 0,
      likeCount: 0,
      dislikeCount: 0,
      vote_count: 0,
      user_vote: 0,
      comment_votes: [],
    };
  }

  // Calculate vote counts for a comment with optimistic updates
  public calculateVoteCounts(comment: Comment): {
    likeCount: number;
    dislikeCount: number;
    netScore: number;
    userVote: number;
  } {
    const votes = comment.comment_votes || [];

    // Apply pending vote if exists
    const pendingVote = this.state.pendingVotes.get(comment.id);

    let likeCount = 0;
    let dislikeCount = 0;
    let userVote = comment.user_vote || 0;

    // Count existing votes
    votes.forEach((vote: { value: number; user_id?: string }) => {
      if (vote.value === 1) likeCount++;
      else if (vote.value === -1) dislikeCount++;
    });

    // Apply optimistic vote if pending
    if (pendingVote) {
      // Remove previous vote from counts
      if (comment.user_vote === 1) likeCount--;
      else if (comment.user_vote === -1) dislikeCount--;

      // Add new vote to counts
      if (pendingVote.value === 1) likeCount++;
      else if (pendingVote.value === -1) dislikeCount++;

      userVote = pendingVote.value;
    }

    const netScore = likeCount - dislikeCount;

    return {
      likeCount,
      dislikeCount,
      netScore,
      userVote,
    };
  }

  // Persistence methods
  private persistToStorage(): void {
    try {
      if (typeof window === "undefined") return;

      // Convert Maps to arrays for JSON serialization
      const pendingCommentsArray = Array.from(
        this.state.pendingComments.entries()
      );
      const pendingVotesArray = Array.from(this.state.pendingVotes.entries());

      localStorage.setItem(
        STORAGE_KEYS.PENDING_COMMENTS,
        JSON.stringify(pendingCommentsArray)
      );
      localStorage.setItem(
        STORAGE_KEYS.PENDING_VOTES,
        JSON.stringify(pendingVotesArray)
      );
      localStorage.setItem(
        STORAGE_KEYS.ROLLBACK_QUEUE,
        JSON.stringify(this.state.rollbackQueue)
      );
    } catch (error) {
      console.warn("Failed to persist optimistic state:", error);
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === "undefined") return;

      // Load pending comments
      const pendingCommentsData = localStorage.getItem(
        STORAGE_KEYS.PENDING_COMMENTS
      );
      if (pendingCommentsData) {
        const pendingCommentsArray = JSON.parse(pendingCommentsData);
        this.state.pendingComments = new Map(pendingCommentsArray);
      }

      // Load pending votes
      const pendingVotesData = localStorage.getItem(STORAGE_KEYS.PENDING_VOTES);
      if (pendingVotesData) {
        const pendingVotesArray = JSON.parse(pendingVotesData);
        this.state.pendingVotes = new Map(pendingVotesArray);
      }

      // Load rollback queue
      const rollbackQueueData = localStorage.getItem(
        STORAGE_KEYS.ROLLBACK_QUEUE
      );
      if (rollbackQueueData) {
        this.state.rollbackQueue = JSON.parse(rollbackQueueData);
      }

      // Clean up old entries
      this.cleanupOldEntries();
    } catch (error) {
      console.warn("Failed to load optimistic state from storage:", error);
      this.clearStorage();
    }
  }

  // Cleanup methods
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEntries();
    }, CLEANUP_TIMEOUT);
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    let hasChanges = false;

    // Clean up old pending comments
    for (const [tempId, comment] of this.state.pendingComments) {
      if (now - comment.timestamp > CLEANUP_TIMEOUT) {
        this.state.pendingComments.delete(tempId);
        hasChanges = true;
      }
    }

    // Clean up old pending votes
    for (const [commentId, vote] of this.state.pendingVotes) {
      if (now - vote.timestamp > CLEANUP_TIMEOUT) {
        this.state.pendingVotes.delete(commentId);
        hasChanges = true;
      }
    }

    // Clean up old rollback actions
    this.state.rollbackQueue = this.state.rollbackQueue.filter(
      (action) => now - action.timestamp <= CLEANUP_TIMEOUT
    );

    if (hasChanges) {
      this.persistToStorage();
      this.notify();
    }
  }

  public clearStorage(): void {
    try {
      if (typeof window === "undefined") return;

      localStorage.removeItem(STORAGE_KEYS.PENDING_COMMENTS);
      localStorage.removeItem(STORAGE_KEYS.PENDING_VOTES);
      localStorage.removeItem(STORAGE_KEYS.ROLLBACK_QUEUE);
    } catch (error) {
      console.warn("Failed to clear optimistic state storage:", error);
    }
  }

  // Cleanup on destroy
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.listeners.clear();
  }

  // Pin cleanup operations
  public async deletePinIfEmpty(pinId: string): Promise<boolean> {
    // This method will be implemented in the next task when integrating with the pin service
    // For now, it's a placeholder that returns false
    console.log("deletePinIfEmpty called for pin:", pinId);
    return false;
  }

  // Debug methods
  public getState(): OptimisticState {
    return {
      pendingComments: new Map(this.state.pendingComments),
      pendingVotes: new Map(this.state.pendingVotes),
      rollbackQueue: [...this.state.rollbackQueue],
    };
  }

  public clearAllPendingOperations(): void {
    this.state.pendingComments.clear();
    this.state.pendingVotes.clear();
    this.state.rollbackQueue = [];
    this.persistToStorage();
    this.notify();
  }
}

// Singleton instance
let optimisticStateManager: OptimisticStateManager | null = null;

export function getOptimisticStateManager(): OptimisticStateManager {
  if (!optimisticStateManager) {
    optimisticStateManager = new OptimisticStateManager();
  }
  return optimisticStateManager;
}

// Cleanup function for app shutdown
export function destroyOptimisticStateManager(): void {
  if (optimisticStateManager) {
    optimisticStateManager.destroy();
    optimisticStateManager = null;
  }
}
