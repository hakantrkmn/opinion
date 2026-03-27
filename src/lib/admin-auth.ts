import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function checkAdminAuth(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) return false;

    // Check role first (preferred), fall back to email check
    if (session.user.role === "admin") return true;
    if (ADMIN_EMAIL && session.user.email === ADMIN_EMAIL) return true;

    return false;
  } catch {
    return false;
  }
}
