/** Absolute invite link for a code (the /c/:code page). */
export function inviteUrl(code: string): string {
  return `${window.location.origin}/c/${encodeURIComponent(code)}`;
}

/** The map filtered to one community. */
export function communityMapHref(id: string): string {
  return `/?scope=community&community=${encodeURIComponent(id)}`;
}
