import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "./ProfileClient";

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <ProfileClient user={user} />
      </main>
    </div>
  );
}
