import DynamicProfilePage from "@/components/profile/DynamicProfilePage";
import { getServerSession } from "@/lib/auth-server";
import { userService } from "@/lib/services/userService";
import { UserStats } from "@/types";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/auth");
  }

  const user = session.user;
  const { stats, error: statsError } = await userService.getUserStats(user.id);
  const statsobj: UserStats = {
    stats: stats,
    error: statsError,
    performanceInfo: {
      queryTime: 0,
      method: "",
      improvement: "",
    },
  };

  if (statsError) {
    redirect("/404");
  }

  return <DynamicProfilePage user={user} userStats={statsobj} />;
}
