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

export type PinScope = "all" | "following";

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
 * GET /api/pins?minLat&maxLat&minLng&maxLng&scope=all|following
 * Only meaningful at zoom >= PIN_DETAIL_MIN_ZOOM. Server caps the result at
 * PINS_MAX_RESULTS (newest first) and sets `truncated` when capped.
 */
export interface PinsInBoundsResponse {
  pins: PinSummary[];
  truncated: boolean;
}

/**
 * GET /api/pins/clusters?minLat&maxLat&minLng&maxLng&zoom&scope
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
 * GET /api/pins/:id/comments?sort=popular|newest|oldest&limit=50&offset=0
 * → { comments, has_more, total, my_comment_id }
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
