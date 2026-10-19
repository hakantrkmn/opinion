import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import { getServerSession } from "@/server/auth/session";

/**
 * Admin session for server components. Role and deleted_at are re-read from
 * the DB so a demoted or deleted admin loses access immediately.
 */
export async function getAdminSession() {
  const session = await getServerSession();
  if (!session) return null;
  const [row] = await db
    .select({ role: user.role, deletedAt: user.deletedAt })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (!row || row.deletedAt || row.role !== "admin") return null;
  return session;
}

export async function checkAdminAuth(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}
