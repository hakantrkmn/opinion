import DynamicProfilePage from "@/features/profile/components/DynamicProfilePage";
import { requireServerSession } from "@/server/auth/session";
import { getOwnProfile, getUserStats } from "@/server/services/users";
import type { OwnProfileResponse } from "@/types/userTypes";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireServerSession("/profile");

  let initial: OwnProfileResponse;
  try {
    const [profile, stats] = await Promise.all([
      getOwnProfile(session.user.id),
      getUserStats(session.user.id),
    ]);
    initial = { profile, stats };
  } catch {
    // Session for a user that no longer exists / was deleted.
    redirect("/auth?redirect=%2Fprofile");
  }

  return <DynamicProfilePage initial={initial} />;
}
