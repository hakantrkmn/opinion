"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import type { CommunityInvitePreview } from "@/types/api";
import { ArrowRight, Loader2, LogIn, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useJoinCommunity } from "../hooks/use-communities";
import { communityErrorMessage, communityErrorReason } from "../lib/errors";

/** /c/:code — preview of the community and "Join" (or "Sign in to join"). */
export function InviteClient({
  code,
  preview,
  signedIn,
}: {
  code: string;
  preview: CommunityInvitePreview;
  signedIn: boolean;
}) {
  const t = useTranslations("communities");
  const router = useRouter();
  const join = useJoinCommunity(code);
  const [refusal, setRefusal] = useState<string | null>(null);
  const { community: c } = preview;
  const owner = c.owner.display_name ?? t("detail.someone");
  const detailHref = `/communities/${encodeURIComponent(c.id)}`;

  const onJoin = async () => {
    try {
      await join.mutateAsync();
      toast.success(t("invite.joined", { name: c.name }));
      router.push(detailHref);
    } catch (error) {
      // Final answers (removed, blocked, limit, full) stay on the page.
      if (communityErrorReason(error)) setRefusal(communityErrorMessage(error, t));
      else toast.error(t("invite.joinError"), { description: communityErrorMessage(error, t) });
    }
  };

  return (
    <section
      aria-label={t("invite.pageLabel")}
      className="flex flex-col items-center rounded-3xl border border-border/60 bg-card px-5 py-8 text-center shadow-xs sm:px-8 sm:py-10"
    >
      <span className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <UsersRound aria-hidden className="size-8" />
      </span>
      <div className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Avatar src={c.owner.avatar_url} alt="" size="sm" fallbackText={owner} className="size-6 text-[10px]" />
        <span>
          {t.rich("invite.invitedYou", {
            name: owner,
            b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </span>
      </div>
      <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-balance text-foreground [overflow-wrap:anywhere] sm:text-[1.75rem]">
        {c.name}
      </h1>
      <p className="mt-1 text-sm tabular-nums text-muted-foreground">
        {t("invite.members", { count: c.members_count })}
      </p>
      {c.description ? (
        <p className="mt-4 max-w-[46ch] whitespace-pre-line text-sm leading-relaxed text-pretty text-foreground/90 [overflow-wrap:anywhere]">
          {c.description}
        </p>
      ) : null}
      <p className="mt-5 max-w-[46ch] text-xs leading-relaxed text-pretty text-muted-foreground">
        {t("invite.explain")}
      </p>

      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        {preview.is_member ? (
          <>
            <p className="text-sm font-medium text-foreground">{t("invite.alreadyMember")}</p>
            <Button asChild className="h-11 rounded-xl">
              <Link href={detailHref}>
                {t("invite.open")}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </>
        ) : !signedIn ? (
          <Button asChild className="h-11 rounded-xl">
            <Link href={`/auth?redirect=${encodeURIComponent(`/c/${code}`)}`}>
              <LogIn aria-hidden />
              {t("invite.signInToJoin")}
            </Link>
          </Button>
        ) : refusal ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {refusal}
          </p>
        ) : (
          <Button className="h-11 rounded-xl" disabled={join.isPending} onClick={() => void onJoin()}>
            {join.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <UsersRound aria-hidden />}
            {join.isPending ? t("invite.joining") : t("invite.join")}
          </Button>
        )}
      </div>
    </section>
  );
}
