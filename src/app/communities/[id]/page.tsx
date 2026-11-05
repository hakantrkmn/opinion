import Header from "@/components/common/Header";
import { CommunityDetailClient } from "@/features/communities/components/CommunityDetailClient";
import { requireServerSession } from "@/server/auth/session";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("communities.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireServerSession(`/communities/${encodeURIComponent(id)}`);
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main>
        <CommunityDetailClient id={id} />
      </main>
    </div>
  );
}
