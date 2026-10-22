// Pure helpers for direct APNs / FCM delivery: shared types, token validation
// and payload shaping. No I/O, so they are unit-testable.

export type PushPlatform = "ios" | "android";

export type PushDevice = { token: string; platform: PushPlatform };

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/** Per-platform delivery outcome. `dead` tokens are deactivated. */
export type DeliveryReport = { sent: number; failed: number; dead: string[] };

export const emptyReport = (): DeliveryReport => ({ sent: 0, failed: 0, dead: [] });

/** APNs device tokens are 32 bytes hex-encoded (64 chars); allow longer future formats. */
const APNS_TOKEN = /^[0-9a-fA-F]{64,200}$/;
/** FCM registration tokens: URL-safe characters with a `:` separator, ~150–250 chars. */
const FCM_TOKEN = /^[A-Za-z0-9_:-]{100,1024}$/;

export function isValidPushToken(token: string, platform: PushPlatform): boolean {
  return platform === "ios" ? APNS_TOKEN.test(token) : FCM_TOKEN.test(token);
}

/**
 * Custom keys for the APNs payload. They sit at the top level next to `aps`,
 * which is where iOS exposes them in `userInfo`.
 */
export function apnsCustomData(payload: PushPayload): Record<string, unknown> {
  const data = { ...(payload.data ?? {}) };
  delete data.aps;
  return data;
}

/**
 * FCM data block. Messages are data-only (no `notification`) so the Android
 * app always builds the notification itself and can route taps; FCM requires
 * every value to be a string.
 */
export function fcmData(payload: PushPayload): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload.data ?? {})) {
    if (value === undefined || value === null) continue;
    data[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  data.title = payload.title;
  data.body = payload.body;
  return data;
}

/** APNs reasons meaning the token will never work for this app again. */
const APNS_DEAD_REASONS = new Set(["Unregistered", "BadDeviceToken", "DeviceTokenNotForTopic"]);

export function isDeadApnsResponse(status: number | undefined, reason: string | undefined): boolean {
  return status === 410 || (reason !== undefined && APNS_DEAD_REASONS.has(reason));
}

/** firebase-admin error codes meaning the registration token is gone. */
const FCM_DEAD_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

export function isDeadFcmError(code: string | undefined): boolean {
  return code !== undefined && FCM_DEAD_CODES.has(code);
}

/**
 * A credential env var holds either the file path or the content itself.
 * PEM pasted into an env var often carries literal `\n` that must become real
 * newlines; JSON keeps them, since `\n` is a valid escape inside its strings.
 */
export function credentialSource(value: string): { kind: "inline"; content: string } | { kind: "path"; path: string } {
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) return { kind: "inline", content: trimmed };
  if (trimmed.startsWith("-----BEGIN")) return { kind: "inline", content: trimmed.replace(/\\n/g, "\n") };
  return { kind: "path", path: trimmed };
}
