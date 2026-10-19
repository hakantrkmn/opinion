/**
 * HTTP contract for the users / profile / social / moderation / admin APIs.
 * Same conventions as src/types/api.ts: snake_case JSON, ISO-8601 UTC
 * timestamps, `ApiError` bodies on non-2xx, `Paginated<T>` for lists
 * (`?limit=&offset=`, default limit 20, max 50).
 *
 * Soft-deleted users are never returned as standalone resources (404). When
 * they appear embedded (e.g. as a pin/comment author) `display_name` and
 * `avatar_url` are null.
 */
import type {
  CommentItem,
  Paginated,
  PhotoMetadata,
  PinSummary,
  UserSummary,
} from "./api";

export type { UserSummary };

/** Public profile. GET /api/users/:id → { user, stats, viewer } */
export interface PublicUserProfile extends UserSummary {
  created_at: string;
}

export interface UserStats {
  total_pins: number;
  total_comments: number;
  total_likes_received: number;
  total_dislikes_received: number;
  total_votes_given: number;
  followers_count: number;
  following_count: number;
  last_activity_at: string | null;
}

/** Relationship between the signed-in viewer and a profile. */
export interface ViewerRelationship {
  is_self: boolean;
  is_following: boolean;
  is_blocked: boolean;
}

export interface PublicUserResponse {
  user: PublicUserProfile;
  stats: UserStats;
  viewer: ViewerRelationship;
}

/** GET /api/users/:id/stats → { stats } */
export interface UserStatsResponse {
  stats: UserStats;
}

/** Own profile. GET /api/profile → { profile, stats } */
export interface OwnUserProfile extends PublicUserProfile {
  email: string;
  email_verified: boolean;
  role: "user" | "admin";
}

export interface OwnProfileResponse {
  profile: OwnUserProfile;
  stats: UserStats;
}

/** PATCH /api/profile { display_name } → { profile } */
export interface UpdateProfileRequest {
  display_name?: string;
}

/** DELETE /api/profile/account { password } → 204 */
export interface DeleteAccountRequest {
  password: string;
}

/** Item of GET /api/users/:id/comments and GET /api/profile/comments. */
export interface UserCommentItem extends CommentItem {
  pin: { id: string; name: string };
}

export type UserPinsPage = Paginated<PinSummary>;
export type UserCommentsPage = Paginated<UserCommentItem>;

/** Followers / following lists. */
export interface FollowListUser extends UserSummary {
  followed_at: string;
}
export type FollowListPage = Paginated<FollowListUser>;

/** POST|DELETE /api/users/:id/follow → { is_following } */
export interface FollowStatusResponse {
  is_following: boolean;
}

/** GET /api/users/search?q=&limit=&offset= (q ≥ 2 chars) */
export type UserSearchPage = Paginated<UserSummary>;

/** GET /api/blocks → Paginated<BlockedUser> */
export interface BlockedUser extends UserSummary {
  blocked_at: string;
}

/** POST|DELETE /api/users/:id/block → { is_blocked } */
export interface BlockStatusResponse {
  is_blocked: boolean;
}

export type ReportTargetType = "pin" | "comment" | "user";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "other";

/** POST /api/reports → 201 { ok: true } (duplicates are idempotent) */
export interface CreateReportRequest {
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  note?: string | null;
}

/** POST /api/push/register → { ok: true }; DELETE /api/push/register → 204 */
export interface RegisterPushTokenRequest {
  token: string;
  platform: "ios" | "android";
  device_name?: string | null;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/** Admin lists add a total count to the standard envelope. */
export type AdminPage<T> = Paginated<T> & { total: number };

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  email_verified: boolean;
  created_at: string;
  deleted_at: string | null;
  active_push_tokens: number;
}

export interface AdminPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  created_at: string;
  comments_count: number;
  user: UserSummary & { email: string | null };
}

export interface AdminComment {
  id: string;
  text: string;
  photo_url: string | null;
  photo_metadata: PhotoMetadata | null;
  is_first_comment: boolean;
  created_at: string;
  pin: { id: string; name: string };
  user: UserSummary & { email: string | null };
}

export type AdminReportStatus = "open" | "resolved" | "dismissed";

export interface AdminReport {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  note: string | null;
  status: AdminReportStatus;
  created_at: string;
  resolved_at: string | null;
  reporter: (UserSummary & { email: string | null }) | null;
  target: {
    /** Pin name, comment excerpt or user display name. */
    label: string | null;
    author: (UserSummary & { email: string | null }) | null;
    /** The reported entity no longer exists. */
    missing: boolean;
  };
}

/** PATCH /api/admin/reports/:id { action } → { report: { id, status } } */
export type AdminReportAction = "resolve" | "dismiss" | "delete_target";

export interface AdminAnalytics {
  total_users: number;
  deleted_users: number;
  total_pins: number;
  total_comments: number;
  total_likes: number;
  total_dislikes: number;
  open_reports: number;
  active_push_tokens: number;
  /** Daily counts for the last 14 days (oldest first). */
  daily: Array<{ date: string; pins: number; comments: number; users: number }>;
  top_users: Array<
    UserSummary & {
      total_pins: number;
      total_comments: number;
      total_likes_received: number;
    }
  >;
}

/** POST /api/admin/notifications/send */
export interface SendNotificationRequest {
  target: { type: "user"; user_id: string } | { type: "all" };
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface SendNotificationResult {
  recipient_count: number;
  sent: number;
  failed: number;
  deactivated: number;
}

export interface AdminNotificationLog {
  id: string;
  actor_email: string | null;
  target_type: string;
  target_id: string | null;
  title: string | null;
  body: string | null;
  result: SendNotificationResult | null;
  created_at: string;
}
