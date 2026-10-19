import DynamicAdminDashboard from "@/features/admin/components/DynamicAdminDashboard";
import Header from "@/components/common/Header";
import { getAdminSession } from "@/server/auth/admin";
import { getServerSession } from "@/server/auth/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await getServerSession())) redirect("/auth?redirect=%2Fadmin");
  // Role is re-read from the DB (not trusted from a cached session).
  if (!(await getAdminSession())) redirect("/");

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main>
        <DynamicAdminDashboard />
      </main>
    </div>
  );
}
