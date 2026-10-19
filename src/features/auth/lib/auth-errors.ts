/**
 * Human-friendly messages for better-auth error codes (and our own hook
 * codes). Falls back to the server message.
 */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password.",
  INVALID_EMAIL: "Enter a valid email address.",
  INVALID_PASSWORD: "Incorrect password.",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  PASSWORD_TOO_LONG: "Password must be at most 128 characters.",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists.",
  INVALID_DISPLAY_NAME: "Display name must be 2–50 characters.",
  ACCOUNT_DELETED: "This account has been deleted.",
  INVALID_OTP: "That code is incorrect.",
  OTP_EXPIRED: "That code has expired. Request a new one.",
  TOO_MANY_ATTEMPTS: "Too many attempts. Request a new code.",
  SESSION_EXPIRED: "Please sign in again to continue.",
  USER_NOT_FOUND: "No account found for this email.",
};

export function authErrorMessage(
  error: { code?: string; message?: string; status?: number } | null | undefined,
  fallback = "Something went wrong. Please try again."
): string {
  if (!error) return fallback;
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  return error.message || fallback;
}

export class AuthClientError extends Error {
  constructor(public info: { code?: string; message?: string; status?: number }) {
    super(authErrorMessage(info));
    this.name = "AuthClientError";
  }
}
