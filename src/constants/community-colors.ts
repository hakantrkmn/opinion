/**
 * Colors a founder can give their community; its members-only pins are
 * drawn in it on the map. Stored by key (communities.color). Kept clear of
 * the activity greens/amber and the blue location dot, and dark enough for
 * the white pin outline and the dark speech bubble.
 */
export const COMMUNITY_COLORS = {
  violet: "#8b5cf6",
  indigo: "#6366f1",
  sky: "#0ea5e9",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  red: "#ef4444",
  orange: "#f97316",
  slate: "#64748b",
} as const;

export type CommunityColor = keyof typeof COMMUNITY_COLORS;

export const COMMUNITY_COLOR_KEYS = Object.keys(COMMUNITY_COLORS) as [
  CommunityColor,
  ...CommunityColor[],
];

export const DEFAULT_COMMUNITY_COLOR: CommunityColor = "violet";

/** A stored key, or the default for anything unknown (e.g. a retired color). */
export function toCommunityColor(value: unknown): CommunityColor {
  return typeof value === "string" && value in COMMUNITY_COLORS
    ? (value as CommunityColor)
    : DEFAULT_COMMUNITY_COLOR;
}
