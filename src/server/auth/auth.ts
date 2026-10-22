import "server-only";
import { hashPassword, verifyPassword } from "./password";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { bearer } from "better-auth/plugins/bearer";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema/auth";
import { sendOtpEmail } from "@/server/services/email";
import { RATE_LIMITS } from "@/server/http/rate-limit";
import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  normalizeDisplayName,
} from "@/lib/validation/user-schemas";

const isProduction = process.env.NODE_ENV === "production";
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Header the auth route handler sets to the trusted client IP (see
 * src/app/api/auth/[...all]/route.ts). Any client-supplied value is
 * overwritten there, so better-auth's rate limiter can't be spoofed.
 */
export const CLIENT_IP_HEADER = "x-app-client-ip";

/** Custom URL scheme of the native app. */
export const MOBILE_APP_ORIGIN = "opinionmobile://";

function requireSecret(): string | undefined {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (isProduction && !isBuildPhase && (!secret || secret.length < 32)) {
    throw new Error(
      "BETTER_AUTH_SECRET must be set (>= 32 chars) in production. Generate one with `openssl rand -base64 32`."
    );
  }
  return secret;
}

function trustedOrigins(): string[] {
  const origins = new Set<string>([MOBILE_APP_ORIGIN]);
  for (const value of [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]) {
    if (!value) continue;
    try {
      origins.add(new URL(value).origin);
    } catch {
      /* ignore malformed env */
    }
  }
  for (const extra of (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(",")) {
    if (extra.trim()) origins.add(extra.trim());
  }
  if (!isProduction) origins.add("http://localhost:3000");
  return [...origins];
}

function validateDisplayName(raw: unknown): string {
  const value = normalizeDisplayName(typeof raw === "string" ? raw : "");
  if (value.length < DISPLAY_NAME_MIN || value.length > DISPLAY_NAME_MAX) {
    throw new APIError("BAD_REQUEST", {
      message: `Display name must be ${DISPLAY_NAME_MIN}-${DISPLAY_NAME_MAX} characters`,
      code: "INVALID_DISPLAY_NAME",
    });
  }
  return value;
}

export const auth = betterAuth({
  appName: "droPINion",
  secret: requireSecret(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    // Email verification is optional: unverified users can use the app and
    // verify later from their profile (email OTP).
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    // Same scrypt format as the default, but off the event loop.
    password: { hash: hashPassword, verify: verifyPassword },
  },
  emailVerification: {
    // Delivered as an email OTP (emailOTP.overrideDefaultEmailVerification).
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days (mobile-friendly)
    updateAge: 60 * 60 * 24, // refresh expiry at most once a day
    // No cookie cache: every getSession reads the DB, so role changes,
    // revoked sessions and soft-deleted users take effect immediately.
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    // In-process memory store: fine for the single-container deployment.
    // Switch to "database" or secondary storage when running >1 instance.
    storage: "memory",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/*": {
        window: RATE_LIMITS.auth.windowMs / 1000,
        max: RATE_LIMITS.auth.limit,
      },
      "/sign-up/*": { window: 60, max: 5 },
      "/email-otp/*": { window: 60, max: 5 },
      "/forget-password/*": { window: 60, max: 3 },
      "/change-password": { window: 60, max: 5 },
      "/get-session": { window: 60, max: 300 },
    },
  },
  advanced: {
    useSecureCookies: isProduction,
    ipAddress: {
      ipAddressHeaders: [CLIENT_IP_HEADER],
    },
  },
  trustedOrigins: trustedOrigins(),
  user: {
    additionalFields: {
      displayName: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
      },
      avatarUrl: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
  plugins: [
    bearer(),
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      storeOTP: "hashed",
      // OTP sign-in must not silently create accounts (sign-up goes through
      // email+password with display name validation).
      disableSignUp: true,
      overrideDefaultEmailVerification: true,
      changeEmail: { enabled: true },
      sendVerificationOTP: async ({ email, otp, type }) => {
        // Not awaited by callers' timing: sendOtpEmail never throws.
        await sendOtpEmail(email, otp, type);
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // display name defaults to the sign-up `name`.
          const displayName = validateDisplayName(
            (user as { displayName?: unknown }).displayName ?? user.name
          );
          return {
            data: { ...user, name: displayName, displayName, role: "user" },
          };
        },
        after: async (user) => {
          try {
            await db.execute(
              sql`INSERT INTO user_stats (user_id) VALUES (${user.id}) ON CONFLICT (user_id) DO NOTHING`
            );
          } catch {
            // The initialize_user_stats trigger covers this as well.
          }
        },
      },
      update: {
        before: async (data) => {
          const patch: Record<string, unknown> = {};
          if ("displayName" in data && data.displayName !== undefined) {
            patch.displayName = validateDisplayName(data.displayName);
          }
          if ("name" in data && data.name !== undefined) {
            patch.name = validateDisplayName(data.name);
          }
          // `image` is unused by the app (avatars go through /api/upload);
          // don't let clients point it at arbitrary URLs.
          if ("image" in data && data.image !== undefined) patch.image = null;
          return { data: { ...data, ...patch } };
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const [row] = await db
            .select({ deletedAt: schema.user.deletedAt })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId))
            .limit(1);
          if (!row || row.deletedAt) {
            throw new APIError("FORBIDDEN", {
              message: "This account has been deleted",
              code: "ACCOUNT_DELETED",
            });
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
