import Header from "@/components/common/Header";
import { CommunitiesClient } from "@/features/communities/components/CommunitiesClient";
import { requireServerSession } from "@/server/auth/session";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("communities.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function CommunitiesPage() {
  await requireServerSession("/communities");
  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main>
        <CommunitiesClient />
      </main>
    </div>
  );
}
