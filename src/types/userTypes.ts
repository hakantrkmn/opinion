export interface UserStats {
  stats: {
    totalPins: number;
    totalComments: number;
    totalLikes: number;
    totalDislikes: number;
    totalVotesGiven?: number;
    followersCount: number;
    followingCount: number;
    lastActivityAt?: string;
  } | null;
  performanceInfo: {
    queryTime: number;
    method: string;
    improvement?: string;
  };
  error: string | null;
}

export interface UserProfileSummary {
  id: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface OwnUserProfile extends UserProfileSummary {
  email: string;
}

export type PublicUserProfile = UserProfileSummary;

export interface BlockedUser {
  id: string;
  displayName?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  image?: string | null;
  createdAt: string;
}

export type ReportTargetType = "pin" | "comment" | "user";
export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "other";

export interface FollowListUser {
  id: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface FollowListResponse {
  users: FollowListUser[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  error: string | null;
}

export interface FollowStatusResponse {
  isFollowing: boolean;
}

export interface UserSearchResponse {
  users: FollowListUser[];
}
