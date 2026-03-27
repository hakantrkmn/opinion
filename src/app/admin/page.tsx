import { getServerSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import DynamicAdminDashboard from "@/components/DynamicAdminDashboard";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/");
  }

  if (session.user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <DynamicAdminDashboard />
    </div>
  );
}
