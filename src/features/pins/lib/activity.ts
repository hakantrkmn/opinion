/**
 * Pin activity tiers by `comments_count` (the first comment counts). Shared by
 * the map pin images and the pin detail header so they always agree.
 */
export const PIN_ACTIVITY = {
  new: { min: 0, color: "#34d399", label: "New" }, // emerald-400
  active: { min: 2, color: "#10b981", label: "Active" }, // emerald-500
  hot: { min: 11, color: "#f59e0b", label: "Hot" }, // amber-500
} as const;

export type PinActivity = keyof typeof PIN_ACTIVITY;

export function pinActivity(commentsCount: number): PinActivity {
  if (commentsCount >= PIN_ACTIVITY.hot.min) return "hot";
  if (commentsCount >= PIN_ACTIVITY.active.min) return "active";
  return "new";
}
