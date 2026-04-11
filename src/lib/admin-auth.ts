import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function checkAdminAuth(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session?.user?.role === "admin";
  } catch {
    return false;
  }
}

export async function getAdminSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (session?.user?.role !== "admin") return null;
    return session;
  } catch {
    return null;
  }
}
