import DynamicProfilePage from "@/components/profile/DynamicProfilePage";
import { createClient } from "@/lib/supabase/server";
import { userService } from "@/lib/supabase/userService";
import { UserStats } from "@/types";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const supabase = await createClient();

  // Server-side auth kontrolü
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth");
  }
  const { stats, error: statsError } = await userService.getUserStats(user.id);
  if (statsError) {
    redirect("/404");
  }
  return (
    <DynamicProfilePage user={user} userStats={stats as unknown as UserStats} />
  );
}
