import { ApiError, errorMessage } from "@/lib/api/client";

const REASONS = ["removed", "blocked", "limit", "full"] as const;
export type CommunityErrorReason = (typeof REASONS)[number];

/** `issues.reason` of a community API error (403 / 409), if any. */
export function communityErrorReason(error: unknown): CommunityErrorReason | null {
  if (!(error instanceof ApiError)) return null;
  const reason = (error.issues as { reason?: unknown } | undefined)?.reason;
  return REASONS.find((r) => r === reason) ?? null;
}

/** Localized message: a known reason first, then the generic API message. */
export function communityErrorMessage(
  error: unknown,
  t: (key: `errors.${CommunityErrorReason}`) => string
): string {
  const reason = communityErrorReason(error);
  return reason ? t(`errors.${reason}`) : errorMessage(error);
}
