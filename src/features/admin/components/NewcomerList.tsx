"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { useAdminNewcomers } from "@/features/admin/hooks/use-admin";
import { AdminListShell } from "@/features/admin/components/AdminListShell";
import { adminInlineLink, adminRow } from "@/features/admin/components/row-styles";
import { pinMapHref } from "@/features/profile/components/sections/ProfileLists";
import { formatTimeAgo } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { MessageCircleReply } from "lucide-react";
import Link from "next/link";

interface NewcomerListProps {
  query: ReturnType<typeof useAdminNewcomers>;
}

/**
 * First posts by new members, unanswered first. Replying or liking on the
 * map moves a post down (it counts as answered); nothing is stored here.
 */
export function NewcomerList({ query }: NewcomerListProps) {
  const items = query.items;
  const waiting = query.firstPage?.waiting ?? 0;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Posts by members who joined in the last 14 days.{" "}
        {waiting > 0 ? (
          <span className="font-medium text-foreground">
            {waiting} still {waiting === 1 ? "waits" : "wait"} for a first reply or like.
          </span>
        ) : query.firstPage ? (
          "Everyone has heard back."
        ) : null}
      </p>
      <AdminListShell
        label="Newcomer posts"
        count={items.length}
        total={query.firstPage?.total}
        emptyLabel="No posts from new members yet."
        isLoading={query.isLoading}
        error={query.error}
        hasMore={query.hasNextPage}
        isFetchingMore={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
        onRetry={() => void query.refetch()}
      >
        {items.map((post) => {
          const name = post.user.display_name || post.user.email || "New member";
          return (
            <li key={post.id} className={cn(adminRow, "items-start", post.answered && "opacity-70")}>
              <Avatar src={post.user.avatar_url} alt="" size="sm" fallbackText={name} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <Link href={`/u/${post.user.id}`} className={cn(adminInlineLink, "font-semibold text-foreground")}>
                    {name}
                  </Link>
                  <span>joined {formatTimeAgo(post.user.joined_at)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {post.user.total_comments} {post.user.total_comments === 1 ? "opinion" : "opinions"}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-3 whitespace-pre-line break-words text-sm">{post.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <Link href={pinMapHref(post.pin)} className={cn(adminInlineLink, "max-w-full truncate text-foreground/80")}>
                    {post.pin.name}
                  </Link>
                  <span aria-hidden>·</span>
                  <span>{formatTimeAgo(post.created_at)}</span>
                  {post.is_first_comment ? <Badge variant="outline">Dropped this pin</Badge> : null}
                  {post.verified_visit ? <Badge variant="outline">Was here</Badge> : null}
                  {post.answered ? (
                    <Badge variant="secondary">Answered</Badge>
                  ) : (
                    <Badge className="border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300">
                      Waiting for a reply
                    </Badge>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 rounded-xl">
                <Link href={pinMapHref(post.pin)}>
                  <MessageCircleReply aria-hidden className="size-4" />
                  Reply
                </Link>
              </Button>
            </li>
          );
        })}
      </AdminListShell>
    </div>
  );
}
