/**
 * Validate a post-login redirect target. Only same-origin relative paths are
 * allowed ("/profile?tab=pins"); anything else (absolute URLs,
 * protocol-relative "//evil.com", backslash tricks, auth pages) falls back
 * to "/".
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/"
): string {
  if (!value || typeof value !== "string") return fallback;
  if (value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/api")) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
