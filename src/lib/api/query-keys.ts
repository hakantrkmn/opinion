export const queryKeys = {
  pins: {
    all: ["pins"] as const,
    comments: (pinId: string) => ["pins", "comments", pinId] as const,
    batchComments: (pinIds: string[]) =>
      ["pins", "batch-comments", pinIds.sort().join(",")] as const,
    hasCommented: (pinId: string) =>
      ["pins", "has-commented", pinId] as const,
  },
  profile: {
    me: ["profile", "me"] as const,
    stats: ["profile", "stats"] as const,
    pins: ["profile", "pins"] as const,
    comments: ["profile", "comments"] as const,
  },
  users: {
    profile: (userId: string) => ["users", "profile", userId] as const,
    stats: (userId: string) => ["users", "stats", userId] as const,
    pins: (userId: string) => ["users", "pins", userId] as const,
    comments: (userId: string) => ["users", "comments", userId] as const,
    followStatus: (userId: string) =>
      ["users", "follow-status", userId] as const,
    followers: (userId: string, page = 1, pageSize = 20) =>
      ["users", "followers", userId, page, pageSize] as const,
    following: (userId: string, page = 1, pageSize = 20) =>
      ["users", "following", userId, page, pageSize] as const,
    search: (query: string, limit = 10, offset = 0) =>
      ["users", "search", query, limit, offset] as const,
  },
  admin: {
    users: (page = 1) => ["admin", "users", page] as const,
    pins: (page = 1) => ["admin", "pins", page] as const,
    comments: (page = 1) => ["admin", "comments", page] as const,
    analytics: ["admin", "analytics"] as const,
    notifications: {
      recent: ["admin", "notifications", "recent"] as const,
    },
  },
} as const;
