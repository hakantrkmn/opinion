import Header from "@/components/common/Header";
import { Button } from "@/components/ui/button";
import { InviteClient } from "@/features/communities/components/InviteClient";
import { inviteCodeParamSchema } from "@/lib/validation/schemas";
import { HttpError } from "@/server/http/api-helpers";
import { getServerSession } from "@/server/auth/session";
import { previewInvite } from "@/server/services/communities";
import type { CommunityInvitePreview } from "@/types/api";
import { LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { cache } from "react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

/** The preview for this request's viewer, or null for unknown / reset codes. */
const loadPreview = cache(async (code: string): Promise<CommunityInvitePreview | null> => {
  if (!inviteCodeParamSchema.safeParse({ code }).success) return null;
  const session = await getServerSession();
  try {
    return await previewInvite(code, session?.user.id ?? null);
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const t = await getTranslations("communities.meta");
  const preview = await loadPreview(code);
  return {
    title: preview ? t("inviteTitle", { name: preview.community.name }) : t("title"),
    robots: { index: false, follow: false },
  };
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;
  const [preview, session, t] = await Promise.all([
    loadPreview(code),
    getServerSession(),
    getTranslations("communities.invite"),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto flex max-w-lg flex-col px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pt-16">
        {preview ? (
          <InviteClient code={code} preview={preview} signedIn={!!session} />
        ) : (
          <section className="flex flex-col items-center rounded-3xl border border-dashed border-border px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <LinkIcon aria-hidden className="size-5" />
            </span>
            <h1 className="mt-4 text-base font-semibold text-foreground">{t("notFoundTitle")}</h1>
            <p className="mt-1 max-w-[40ch] text-sm text-pretty text-muted-foreground">
              {t("notFoundDescription")}
            </p>
            <Button asChild variant="outline" className="mt-5 h-10 rounded-xl">
              <Link href="/">{t("backToMap")}</Link>
            </Button>
          </section>
        )}
      </main>
    </div>
  );
}
