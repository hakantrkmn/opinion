"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { COMMUNITY_MAX_PER_USER } from "@/constants/limits";
import { EmptyState } from "@/features/profile/components/sections/ProfileLists";
import { ListMessage } from "@/features/users/components/UserRow";
import type { CommunitySummary } from "@/types/api";
import { AlertCircle, ChevronRight, Map as MapIcon, Plus, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateCommunity, useMyCommunities } from "../hooks/use-communities";
import { communityErrorMessage } from "../lib/errors";
import { communityMapHref } from "../lib/links";
import { CommunityFormDialog } from "./CommunityFormDialog";

const card = "rounded-3xl border border-border/60 bg-card p-5 shadow-xs sm:p-6";

/** /communities: the viewer's communities and "create". */
export function CommunitiesClient() {
  const t = useTranslations("communities");
  const router = useRouter();
  const query = useMyCommunities();
  const create = useCreateCommunity();
  const [creating, setCreating] = useState(false);
  const items = query.data;
  const full = (items?.length ?? 0) >= COMMUNITY_MAX_PER_USER;

  const onCreate = async (values: { name: string; description: string | null }) => {
    try {
      const res = await create.mutateAsync(values);
      toast.success(t("form.created"), { description: t("form.createdDescription") });
      router.push(`/communities/${encodeURIComponent(res.community.id)}`);
      return res;
    } catch (error) {
      toast.error(t("form.createError"), { description: communityErrorMessage(error, t) });
      throw error;
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-[max(6rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10">
      <section className={card} aria-labelledby="communities-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <h1
              id="communities-title"
              className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[1.75rem]"
            >
              {t("list.title")}
            </h1>
            <p className="max-w-[52ch] text-sm text-pretty text-muted-foreground">
              {t("list.description")}
            </p>
          </div>
          {/* The empty state has its own "Create" button. */}
          {items && items.length > 0 ? (
            <Button
              className="h-10 shrink-0 rounded-xl"
              onClick={() => setCreating(true)}
              disabled={full}
            >
              <Plus aria-hidden />
              {t("list.create")}
            </Button>
          ) : null}
        </div>
        {items && items.length > 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            {full
              ? t("list.limitReached", { max: COMMUNITY_MAX_PER_USER })
              : t("list.limitNote", { max: COMMUNITY_MAX_PER_USER, count: items.length })}
          </p>
        ) : null}
      </section>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <ListMessage
          tone="error"
          icon={<AlertCircle aria-hidden />}
          title={t("list.loadError")}
          description={query.error.message}
          action={
            <Button variant="outline" className="h-10 rounded-xl" onClick={() => void query.refetch()}>
              {t("list.retry")}
            </Button>
          }
        />
      ) : items && items.length > 0 ? (
        <ul className="flex flex-col gap-3" aria-label={t("list.title")}>
          {items.map((c) => (
            <CommunityCard key={c.id} community={c} />
          ))}
        </ul>
      ) : (
        <>
          <EmptyState
            icon={<UsersRound aria-hidden className="size-5" />}
            title={t("list.emptyTitle")}
            description={t("list.emptyDescription")}
            action={
              <Button className="h-10 rounded-xl" onClick={() => setCreating(true)}>
                <Plus aria-hidden />
                {t("list.create")}
              </Button>
            }
          />
          <HowItWorks />
        </>
      )}

      <CommunityFormDialog
        open={creating}
        onOpenChange={setCreating}
        pending={create.isPending}
        onSubmit={onCreate}
      />
    </div>
  );
}

function CommunityCard({ community: c }: { community: CommunitySummary }) {
  const t = useTranslations("communities.list");
  return (
    <li className="relative flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-xs transition-colors duration-150 hover:border-border">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <UsersRound aria-hidden className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={`/communities/${encodeURIComponent(c.id)}`}
          className="truncate text-sm font-semibold text-foreground outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
        >
          {c.name}
        </Link>
        {c.description ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">{c.description}</p>
        ) : null}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {t("members", { count: c.members_count })}
          {c.is_owner ? (
            <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary">
              {t("founder")}
            </span>
          ) : null}
        </p>
      </div>
      <Button
        asChild
        variant="outline"
        size="icon"
        className="relative z-10 size-10 shrink-0 rounded-xl"
      >
        <Link href={communityMapHref(c.id)} aria-label={t("showOnMap")} title={t("showOnMap")}>
          <MapIcon aria-hidden />
        </Link>
      </Button>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground/70 max-sm:hidden" />
    </li>
  );
}

function HowItWorks() {
  const t = useTranslations("communities.list");
  const steps = [t("how1"), t("how2"), t("how3"), t("how4")];
  return (
    <section className={card} aria-labelledby="communities-how">
      <h2 id="communities-how" className="text-sm font-semibold text-foreground">
        {t("howTitle")}
      </h2>
      <ol className="mt-3 flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-foreground">
              {i + 1}
            </span>
            <span className="pt-0.5 text-pretty">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/60 p-4">
          <Skeleton className="size-11 rounded-2xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
