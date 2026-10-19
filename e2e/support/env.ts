import path from "node:path";

/** Where the app under test runs (same default as playwright.config.ts). */
export const BASE_URL = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const ORIGIN = new URL(BASE_URL).origin;

/** Seeded accounts (scripts/seed.ts). All share one password. */
export const SEED_PASSWORD = "password1234";
export const SEEDED = {
  admin: { email: "admin@example.test", id: "seed_admin" },
  /** Blocked user2; is blocked BY user3. */
  user1: { email: "user1@example.test", id: "seed_user_01" },
  user3: { email: "user3@example.test", id: "seed_user_03" },
  /** Neutral account used as a follow target. */
  user5: { email: "user5@example.test", id: "seed_user_05" },
} as const;

/** Roles signed in once by global-setup; cookies saved under e2e/.auth/. */
export type Role = "admin" | "user1";
export const AUTH_DIR = path.join(__dirname, "..", ".auth");
export const storageStatePath = (role: Role) => path.join(AUTH_DIR, `${role}.json`);

/** Sultanahmet: dense seeded pins around here, and where test pins are dropped. */
export const ISTANBUL = { lat: 41.0082, lng: 28.9784 };

/**
 * A unique client IP for one auth flow.
 *
 * better-auth rate-limits sign-up (5/min) and sign-in (10/min) per client
 * IP, with a window that only resets after a quiet minute — a suite that
 * signs up a few throw-away users per run would lock itself out on the
 * second back-to-back run. The app derives the client IP from the rightmost
 * X-Forwarded-For entry (TRUSTED_PROXY_HOPS=1) and `next dev` keeps a
 * client-supplied X-Forwarded-For, so locally each flow can get its own
 * bucket. Addresses come from 198.18.0.0/15 (RFC 2544, benchmarking).
 */
export function uniqueTestIp(): string {
  const r = (n: number) => Math.floor(Math.random() * n);
  return `198.${18 + r(2)}.${r(256)}.${1 + r(254)}`;
}

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
