import { getServerSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import DynamicAdminDashboard from "@/components/DynamicAdminDashboard";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <DynamicAdminDashboard />
    </div>
  );
}
