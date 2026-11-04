import { useTranslations } from "next-intl";
import { useCallback } from "react";
import enAuth from "../../../../messages/en/auth.json";

type AuthErrorInfo = { code?: string; message?: string; status?: number };
export type AuthErrorKey = keyof typeof enAuth.errors;

/**
 * better-auth error codes (and our own hook codes) → message keys in the
 * `auth.errors` namespace. Unknown codes fall back to the server message.
 */
const ERROR_KEYS: Record<string, AuthErrorKey> = {
  INVALID_EMAIL_OR_PASSWORD: "invalidEmailOrPassword",
  INVALID_EMAIL: "invalidEmail",
  INVALID_PASSWORD: "invalidPassword",
  PASSWORD_TOO_SHORT: "passwordTooShort",
  PASSWORD_TOO_LONG: "passwordTooLong",
  USER_ALREADY_EXISTS: "userAlreadyExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "userAlreadyExists",
  INVALID_DISPLAY_NAME: "invalidDisplayName",
  ACCOUNT_DELETED: "accountDeleted",
  INVALID_OTP: "invalidOtp",
  OTP_EXPIRED: "otpExpired",
  TOO_MANY_ATTEMPTS: "tooManyAttempts",
  SESSION_EXPIRED: "sessionExpired",
  USER_NOT_FOUND: "userNotFound",
};

/** Message key for a known error, or null to show the server message as-is. */
export function authErrorKey(error: AuthErrorInfo | null | undefined): AuthErrorKey | null {
  if (!error) return null;
  if (error.status === 429) return "rateLimited";
  return (error.code && ERROR_KEYS[error.code]) || null;
}

/**
 * Translated message for an auth error, in the viewer's language. Unknown
 * server messages are shown as they come; `fallback` (already translated)
 * replaces the generic message when there is nothing better.
 */
export function useAuthErrorMessage() {
  const t = useTranslations("auth.errors");
  return useCallback(
    (error: AuthErrorInfo | null | undefined, fallback?: string): string => {
      const generic = fallback ?? t("generic");
      if (!error) return generic;
      const key = authErrorKey(error);
      if (key) return t(key);
      return error.message || generic;
    },
    [t]
  );
}

/**
 * English-only variant for non-React code (e.g. Error.message). UI should
 * use useAuthErrorMessage() so the text follows the viewer's language.
 */
export function authErrorMessage(
  error: AuthErrorInfo | null | undefined,
  fallback: string = enAuth.errors.generic
): string {
  if (!error) return fallback;
  const key = authErrorKey(error);
  if (key) return enAuth.errors[key];
  return error.message || fallback;
}

export class AuthClientError extends Error {
  constructor(public info: AuthErrorInfo) {
    super(authErrorMessage(info));
    this.name = "AuthClientError";
  }
}
