/**
 * Public HTTP API contract shared by the web client and the (upcoming)
 * mobile client. All JSON fields are snake_case. Timestamps are ISO-8601
 * strings in UTC. Errors always use a non-2xx status with `ApiError` body.
 */

export interface ApiError {
  message: string;
  code: ApiErrorCode;
  status: number;
  issues?: unknown;
}

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "TOO_FAR"
  | "INTERNAL_ERROR";

/**
 * Map scope. `community` needs `community_id` (a community the viewer is a
 * member of; 404 NOT_FOUND otherwise) and shows pins that one of its
 * members has an opinion on.
 */
export type PinScope = "all" | "following" | "community";

export interface UserSummary {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Map-ready pin. Coordinates are WGS84 degrees. */
export interface PinSummary {
  id: string;
  name: string;
  lat: number;
  lng: number;
  user: UserSummary;
  comments_count: number;
  created_at: string;
}

/**
 * GET /api/pins/nearest?lat&lng → the closest visible pin (all scope), or
 * null when there are none. `distance_m` is great-circle metres.
 */
export interface NearestPinResponse {
  pin: (PinSummary & { distance_m: number }) | null;
}

/**
 * GET /api/pins?minLat&maxLat&minLng&maxLng&scope=all|following|community&community_id
 * Only meaningful at zoom >= PIN_DETAIL_MIN_ZOOM. Server caps the result at
 * PINS_MAX_RESULTS (newest first) and sets `truncated` when capped.
 */
export interface PinsInBoundsResponse {
  pins: PinSummary[];
  truncated: boolean;
}

/**
 * GET /api/pins/clusters?minLat&maxLat&minLng&maxLng&zoom&scope&community_id
 * Server-side grid aggregation for zoom < PIN_DETAIL_MIN_ZOOM.
 * `lat`/`lng` is the centroid of the pins in the cell. When `count === 1`
 * `pin_id` is set so the client can open the pin directly.
 */
export interface PinCluster {
  key: string;
  lat: number;
  lng: number;
  count: number;
  pin_id: string | null;
}

export interface PinClustersResponse {
  clusters: PinCluster[];
}

/** GET /api/pins/:id → { pin: PinSummary } (404 NOT_FOUND when missing). */
export interface PinResponse {
  pin: PinSummary;
}

/**
 * POST /api/pins (multipart/form-data)
 *   name, comment, lat, lng            – the pin
 *   user_lat, user_lng, accuracy       – the device's current GPS fix; the
 *                                        server rejects with 422 TOO_FAR when
 *                                        the pin is farther than
 *                                        PIN_CREATE_MAX_DISTANCE_M (+ capped
 *                                        accuracy slack) from it
 *   photo?                             – image file (re-encoded server side)
 * → 201 { pin: PinSummary, comment: CommentItem }
 */
export interface CreatePinResponse {
  pin: PinSummary;
  comment: CommentItem;
}

export type VoteValue = -1 | 0 | 1;

export interface PhotoMetadata {
  width: number;
  height: number;
  file_size: number;
  format: string;
}

export interface CommentItem {
  id: string;
  pin_id: string;
  text: string;
  photo_url: string | null;
  photo_metadata: PhotoMetadata | null;
  is_first_comment: boolean;
  /**
   * "Was here": written on site (the author was within ~100 m of the pin
   * when posting, or confirmed it later). Pin-opening comments always are.
   */
  verified_visit: boolean;
  created_at: string;
  updated_at: string;
  user: UserSummary;
  likes: number;
  dislikes: number;
  /** Current viewer's vote; 0 when anonymous or not voted. */
  my_vote: VoteValue;
}

export type CommentSort = "popular" | "newest" | "oldest";

/**
 * GET /api/pins/:id/comments?sort=popular|newest|oldest&limit=50&offset=0&community_id?
 * → { comments, has_more, total, my_comment_id }
 * With `community_id` (a community the viewer is a member of; 404
 * otherwise) only its members' comments are listed and counted.
 * `my_comment_id` is the viewer's own comment on this pin (one per user per
 * pin) or null. 404 NOT_FOUND when the pin does not exist.
 */
export interface PinCommentsResponse {
  comments: CommentItem[];
  has_more: boolean;
  total: number;
  my_comment_id: string | null;
}

/**
 * POST /api/pins/:id/comments (JSON { text, photo_url? }) → 201 { comment }
 *   photo_url must come from POST /api/upload (type=comment-photo) for the
 *   same user. 409 CONFLICT if the user already commented on this pin.
 * PATCH /api/comments/:id (JSON { text?, photo_url? | null }) → { comment }
 * DELETE /api/comments/:id → { pin_deleted: boolean, pin_id: string }
 */
export interface CommentResponse {
  comment: CommentItem;
}

export interface DeleteCommentResponse {
  pin_deleted: boolean;
  pin_id: string;
}

/**
 * PUT /api/comments/:id/vote (JSON { value: -1 | 0 | 1 }), 0 removes the vote.
 * → { likes, dislikes, my_vote }
 */
export interface VoteResponse {
  likes: number;
  dislikes: number;
  my_vote: VoteValue;
}

/** POST /api/upload (multipart file, type=avatar|comment-photo) */
export interface UploadResponse {
  url: string;
  metadata: PhotoMetadata;
}

/** Generic offset pagination envelope for list endpoints. */
export interface Paginated<T> {
  items: T[];
  has_more: boolean;
  next_offset: number | null;
}

// ---------------------------------------------------------------- inbox

/**
 * - pin_commented: `actor` (and `count - 1` others) shared an opinion on a
 *   pin you own (`pin.is_mine`) or already commented on; `comment` is the
 *   latest one.
 * - comment_liked: `count` people liked your `comment`.
 * - followed: `actor` (and `count - 1` others) started following you.
 * - community_joined: `actor` (and `count - 1` others) joined `community`,
 *   which you founded.
 */
export type NotificationType =
  | "pin_commented"
  | "comment_liked"
  | "followed"
  | "community_joined";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  /** Events collapsed into this row (≥ 1); `actor` is the latest. */
  count: number;
  read: boolean;
  created_at: string;
  /** Time of the latest event. Lists are ordered by it, newest first. */
  updated_at: string;
  actor: UserSummary;
  pin: { id: string; name: string; lat: number; lng: number; is_mine: boolean } | null;
  /** Text is truncated to 140 characters. */
  comment: { id: string; text: string } | null;
  community: { id: string; name: string } | null;
}

/** GET /api/notifications/unread-count, POST /api/notifications/read */
export interface UnreadNotificationsResponse {
  unread_count: number;
}

// ---------------------------------------------------------------- communities

/**
 * A founder-made circle joined by invite link: a filter over public pins
 * and comments (map `scope=community`, comments `community_id`). Only
 * members can see a community; only the founder manages it.
 */
export interface CommunitySummary {
  id: string;
  name: string;
  description: string | null;
  owner: UserSummary;
  members_count: number;
  is_owner: boolean;
  created_at: string;
}

/**
 * GET /api/communities → { items } (the viewer's communities, newest join
 * first; at most COMMUNITY_MAX_PER_USER)
 * POST /api/communities { name, description? } → 201 { community }
 *   409 CONFLICT `issues.reason = "limit"` at the per-user limit.
 */
export interface CommunityListResponse {
  items: CommunitySummary[];
}

/**
 * GET /api/communities/:id → { community } (members only, else 404)
 * PATCH /api/communities/:id { name?, description? | null } → { community } (founder)
 * DELETE /api/communities/:id → 204 (founder)
 * `invite_code` is only set for the founder; the invite link is /c/:code.
 */
export interface CommunityResponse {
  community: CommunitySummary & { invite_code: string | null };
}

/** POST /api/communities/:id/invite → a new invite code; the old link stops working. */
export interface CommunityInviteResponse {
  invite_code: string;
}

/**
 * GET /api/communities/:id/members?limit&offset → Paginated<CommunityMember>
 * (members only; founder first, then newest). Blocked and deleted users
 * are omitted.
 * DELETE /api/communities/:id/members/:userId → 204. The founder removes a
 * member (who cannot rejoin by link); a member removes themself (leave).
 * The founder cannot leave, only delete the community.
 */
export interface CommunityMember {
  user: UserSummary;
  is_owner: boolean;
  joined_at: string;
}

/**
 * GET /api/communities/invites/:code → preview (anyone with the link; 404
 * for an unknown or reset code)
 * POST /api/communities/invites/:code → { community } (joins; idempotent).
 *   403 FORBIDDEN `issues.reason = "removed" | "blocked"`, 409 CONFLICT
 *   `issues.reason = "limit" | "full"`.
 */
export interface CommunityInvitePreview {
  community: {
    id: string;
    name: string;
    description: string | null;
    owner: UserSummary;
    members_count: number;
  };
  is_member: boolean;
}
