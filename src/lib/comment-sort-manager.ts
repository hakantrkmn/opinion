import type { Comment, EnhancedComment } from "@/types";

export type SortCriteria = "newest" | "oldest" | "most_liked" | "net_score";

export interface SortOption {
  value: SortCriteria;
  label: string;
  icon: string;
}

export interface CommentWithCalculatedData extends Comment {
  likeCount: number;
  dislikeCount: number;
  netScore: number;
}

export class CommentSortManager {
  private static instance: CommentSortManager;

  public static getInstance(): CommentSortManager {
    if (!CommentSortManager.instance) {
      CommentSortManager.instance = new CommentSortManager();
    }
    return CommentSortManager.instance;
  }

  /**
   * Get available sort options for the UI dropdown
   */
  public getSortOptions(): SortOption[] {
    return [
      {
        value: "newest",
        label: "Newest First",
        icon: "clock",
      },
      {
        value: "oldest",
        label: "Oldest First",
        icon: "history",
      },
      {
        value: "most_liked",
        label: "Most Liked",
        icon: "thumbs-up",
      },
      {
        value: "net_score",
        label: "Best Score",
        icon: "trending-up",
      },
    ];
  }

  /**
   * Calculate like/dislike counts and net score for a comment
   */
  public calculateVoteData(comment: Comment | EnhancedComment): {
    likeCount: number;
    dislikeCount: number;
    netScore: number;
  } {
    // If it's an EnhancedComment with pre-calculated values, use those
    if ("likeCount" in comment && comment.likeCount !== undefined) {
      return {
        likeCount: comment.likeCount,
        dislikeCount: comment.dislikeCount || 0,
        netScore:
          comment.netScore || comment.likeCount - (comment.dislikeCount || 0),
      };
    }

    // Calculate from comment_votes array
    if (comment.comment_votes && Array.isArray(comment.comment_votes)) {
      const likeCount = comment.comment_votes.filter(
        (vote) => vote.value === 1
      ).length;
      const dislikeCount = comment.comment_votes.filter(
        (vote) => vote.value === -1
      ).length;
      const netScore = likeCount - dislikeCount;

      return { likeCount, dislikeCount, netScore };
    }

    // Fallback to zero values
    return { likeCount: 0, dislikeCount: 0, netScore: 0 };
  }

  /**
   * Calculate net score for a comment (like count - dislike count)
   */
  public calculateNetScore(comment: Comment | EnhancedComment): number {
    const { netScore } = this.calculateVoteData(comment);
    return netScore;
  }

  /**
   * Sort comments based on the specified criteria
   */
  public sortComments(
    comments: (Comment | EnhancedComment)[],
    sortBy: SortCriteria
  ): (Comment | EnhancedComment)[] {
    // Create a copy to avoid mutating the original array
    const sortedComments = [...comments];

    switch (sortBy) {
      case "newest":
        return sortedComments.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA; // Newest first (descending)
        });

      case "oldest":
        return sortedComments.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateA - dateB; // Oldest first (ascending)
        });

      case "most_liked":
        return sortedComments.sort((a, b) => {
          const likesA = this.calculateVoteData(a).likeCount;
          const likesB = this.calculateVoteData(b).likeCount;

          // Primary sort: like count (descending)
          if (likesB !== likesA) {
            return likesB - likesA;
          }

          // Secondary sort: newest first for ties
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });

      case "net_score":
        return sortedComments.sort((a, b) => {
          const scoreA = this.calculateNetScore(a);
          const scoreB = this.calculateNetScore(b);

          // Primary sort: net score (descending)
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }

          // Secondary sort: newest first for ties
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });

      default:
        console.warn(
          `Unknown sort criteria: ${sortBy}. Falling back to newest.`
        );
        return this.sortComments(comments, "newest");
    }
  }

  /**
   * Enhance comments with calculated vote data for consistent display
   */
  public enhanceCommentsWithVoteData(
    comments: (Comment | EnhancedComment)[]
  ): CommentWithCalculatedData[] {
    return comments.map((comment) => {
      const voteData = this.calculateVoteData(comment);

      return {
        ...comment,
        likeCount: voteData.likeCount,
        dislikeCount: voteData.dislikeCount,
        netScore: voteData.netScore,
      };
    });
  }

  /**
   * Get sort criteria from a string (useful for URL params or storage)
   */
  public parseSortCriteria(value: string): SortCriteria {
    const validCriteria: SortCriteria[] = [
      "newest",
      "oldest",
      "most_liked",
      "net_score",
    ];

    if (validCriteria.includes(value as SortCriteria)) {
      return value as SortCriteria;
    }

    return "newest"; // Default fallback
  }

  /**
   * Validate if a sort criteria is valid
   */
  public isValidSortCriteria(value: string): value is SortCriteria {
    const validCriteria: SortCriteria[] = [
      "newest",
      "oldest",
      "most_liked",
      "net_score",
    ];
    return validCriteria.includes(value as SortCriteria);
  }
}

// Export singleton instance for convenience
export const commentSortManager = CommentSortManager.getInstance();
