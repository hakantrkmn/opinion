import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";

/** Current session for server components (deduped per request). */
export const getServerSession = cache(async () => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
});

export async function getServerUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

/**
 * For protected pages: returns the session or redirects to the sign-in page
 * with `?redirect=<returnTo>` so the user comes back after signing in.
 */
export async function requireServerSession(returnTo: string) {
  const session = await getServerSession();
  if (!session) {
    redirect(`/auth?redirect=${encodeURIComponent(safeRedirectPath(returnTo))}`);
  }
  return session;
}
