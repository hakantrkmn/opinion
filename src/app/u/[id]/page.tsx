import Header from "@/components/common/Header";
import { PublicProfileClient } from "@/components/profile/PublicProfileClient";
import { getServerSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/auth");
  }

  const { id } = await params;

  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />
      <main>
        <PublicProfileClient userId={id} />
      </main>
    </div>
  );
}
