import DynamicProfilePage from "@/components/profile/DynamicProfilePage";
import { createClient } from "@/lib/supabase/server";
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

  return <DynamicProfilePage user={user} />;
}
