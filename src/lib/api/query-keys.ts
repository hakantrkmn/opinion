export const queryKeys = {
  /**
   * Everything pin related lives under ["pins", ...] so a single
   * `invalidateQueries({ queryKey: queryKeys.pins.all })` refreshes the map.
   */
  pins: {
    all: ["pins"] as const,
    /** Server-side grid clusters (zoom < PIN_DETAIL_MIN_ZOOM). */
    clustersAll: ["pins", "clusters"] as const,
    clusters: (scope: string, zoom: number, bboxKey: string) =>
      ["pins", "clusters", scope, zoom, bboxKey] as const,
    /** Pins inside a (quantized) bbox (zoom >= PIN_DETAIL_MIN_ZOOM). */
    bboxAll: ["pins", "bbox"] as const,
    bbox: (scope: string, bboxKey: string) =>
      ["pins", "bbox", scope, bboxKey] as const,
    detail: (pinId: string) => ["pins", pinId] as const,
    commentsAll: (pinId: string) => ["pins", pinId, "comments"] as const,
    comments: (pinId: string, sort: string) =>
      ["pins", pinId, "comments", sort] as const,
  },
  profile: {
    all: ["profile"] as const,
    /** GET /api/profile → { profile, stats } */
    me: ["profile", "me"] as const,
    /** Stats are part of GET /api/profile; alias kept for callers. */
    stats: ["profile", "me"] as const,
    pins: ["profile", "pins"] as const,
    comments: ["profile", "comments"] as const,
  },
  auth: {
    sessions: ["auth", "sessions"] as const,
  },
  users: {
    all: ["users"] as const,
    /** Everything cached for one user (profile, lists, follow status). */
    detail: (userId: string) => ["users", userId] as const,
    profile: (userId: string) => ["users", userId, "profile"] as const,
    stats: (userId: string) => ["users", userId, "stats"] as const,
    pins: (userId: string) => ["users", userId, "pins"] as const,
    comments: (userId: string) => ["users", userId, "comments"] as const,
    followStatus: (userId: string) =>
      ["users", userId, "follow-status"] as const,
    followers: (userId: string) => ["users", userId, "followers"] as const,
    following: (userId: string) => ["users", userId, "following"] as const,
    search: (query: string) => ["users", "search", query] as const,
  },
  blocks: {
    list: ["blocks", "list"] as const,
  },
  admin: {
    all: ["admin"] as const,
    users: (q = "") => ["admin", "users", q] as const,
    pins: (q = "") => ["admin", "pins", q] as const,
    comments: (q = "") => ["admin", "comments", q] as const,
    analytics: ["admin", "analytics"] as const,
    notifications: {
      recent: ["admin", "notifications", "recent"] as const,
    },
    reports: (status: string) => ["admin", "reports", status] as const,
  },
} as const;
