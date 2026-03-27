import type { MapBounds } from "@/types";

export const queryKeys = {
  pins: {
    all: ["pins"] as const,
    bounds: (bounds: MapBounds, zoom: number) =>
      ["pins", "bounds", JSON.stringify(bounds), zoom] as const,
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
  admin: {
    users: (page = 1) => ["admin", "users", page] as const,
    pins: (page = 1) => ["admin", "pins", page] as const,
    comments: (page = 1) => ["admin", "comments", page] as const,
    analytics: ["admin", "analytics"] as const,
  },
} as const;
