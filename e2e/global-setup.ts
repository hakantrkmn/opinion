import fs from "node:fs";
import { newApi, signInUser } from "./support/api";
import { AUTH_DIR, BASE_URL, SEEDED, storageStatePath, type Role } from "./support/env";

const ROLES: Record<Role, string> = {
  admin: SEEDED.admin.email,
  user1: SEEDED.user1.email,
};

/** True when the saved cookies still resolve to a live session for `email`. */
async function isValid(file: string, email: string): Promise<boolean> {
  if (!fs.existsSync(file)) return false;
  const api = await newApi({ storageState: file });
  try {
    const res = await api.get("/api/auth/get-session");
    if (!res.ok()) return false;
    const body = (await res.json().catch(() => null)) as { user?: { email?: string } } | null;
    return body?.user?.email === email;
  } finally {
    await api.dispose();
  }
}

/**
 * `next dev` compiles routes on first hit. A cold route under parallel load
 * can take long enough to time out a test, and a multipart POST that races
 * the compile of its route handler was seen answering 404 "Server action not
 * found". Touch every route the suite uses once, up front.
 */
async function warmUp() {
  // As admin, so /profile, /admin and the admin APIs actually render.
  const api = await newApi({ storageState: storageStatePath("admin") });
  const paths = [
    "/",
    "/auth",
    "/profile",
    "/admin",
    "/u/warmup",
    "/api/auth/get-session",
    "/api/pins?minLat=41&maxLat=41.01&minLng=28.97&maxLng=28.98&scope=all",
    "/api/pins/clusters?minLat=40&maxLat=42&minLng=28&maxLng=30&zoom=8&scope=all",
    "/api/pins/warmup",
    "/api/pins/warmup/comments",
    "/api/comments/warmup",
    "/api/comments/warmup/vote",
    "/api/upload",
    "/api/profile",
    "/api/profile/pins",
    "/api/profile/comments",
    "/api/users/warmup",
    "/api/users/warmup/follow",
    "/api/users/warmup/pins",
    "/api/admin/analytics",
    "/uploads/warmup.webp",
  ];
  try {
    for (const path of paths) {
      await api.get(path, { maxRedirects: 0, timeout: 120_000 }).catch(() => undefined);
    }
  } finally {
    await api.dispose();
  }
}

/**
 * Signs in once per role via the API and saves the cookies to
 * e2e/.auth/<role>.json. Saved sessions are reused across runs while valid
 * (sessions last 30 days), which keeps us far below the sign-in rate limit.
 */
export default async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  for (const [role, email] of Object.entries(ROLES) as Array<[Role, string]>) {
    const file = storageStatePath(role);
    if (await isValid(file, email)) continue;
    try {
      const { api, storageState } = await signInUser(email);
      fs.writeFileSync(file, JSON.stringify(storageState, null, 2));
      await api.dispose();
    } catch (error) {
      throw new Error(
        `[e2e] Could not sign in ${email} at ${BASE_URL}. Is the dev server up and the DB seeded (npm run db:seed)?\n${String(error)}`
      );
    }
  }

  await warmUp();
}
