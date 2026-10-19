import Header from "@/components/common/Header";
import { PublicProfileClient } from "@/features/profile/components/PublicProfileClient";
import { requireServerSession } from "@/server/auth/session";
import { redirect } from "next/navigation";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireServerSession(`/u/${encodeURIComponent(id)}`);
  if (session.user.id === id) redirect("/profile");

  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />
      <main>
        <PublicProfileClient userId={id} />
      </main>
    </div>
  );
}
