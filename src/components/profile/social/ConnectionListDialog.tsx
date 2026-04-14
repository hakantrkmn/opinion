"use client";

import { Avatar } from "@/components/ui/Avatar";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { useFollowers, useFollowing } from "@/hooks/queries/use-user-social";
import { Loader2, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FollowListUser } from "@/types";

interface ConnectionListDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "followers" | "following";
}

const PAGE_SIZE = 20;

export function ConnectionListDialog({
  userId,
  open,
  onOpenChange,
  type,
}: ConnectionListDialogProps) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FollowListUser[]>([]);
  const followersQuery = useFollowers(userId, page, PAGE_SIZE, open && type === "followers");
  const followingQuery = useFollowing(userId, page, PAGE_SIZE, open && type === "following");
  const query = type === "followers" ? followersQuery : followingQuery;

  useEffect(() => {
    if (!open) {
      setPage(1);
      setItems([]);
    }
  }, [open]);
  const hasMore = query.data?.hasMore ?? false;

  useEffect(() => {
    if (!query.data) return;
    const nextUsers = query.data.users ?? [];

    setItems((current) =>
      page === 1
        ? nextUsers
        : [
            ...current,
            ...nextUsers.filter((user) => !current.some((item) => item.id === user.id)),
          ]
    );
  }, [page, query.data]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        mobileClassName="max-h-[85dvh] overflow-hidden"
        desktopClassName="max-w-xl"
      >
        <ResponsiveDialogPanel
          title={type === "followers" ? "Followers" : "Following"}
          description="Browse the connection list for this profile."
        >
          <div className="max-h-[60dvh] overflow-y-auto px-5 pb-5 sm:px-6">
            {query.isLoading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No {type} yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This list will appear here when connections exist.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((connection) => (
                  <Link
                    key={connection.id}
                    href={`/u/${connection.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border/50 px-4 py-3 transition-colors hover:bg-muted/40"
                    onClick={() => onOpenChange(false)}
                  >
                    <Avatar
                      src={connection.avatar_url}
                      alt={connection.display_name || "User"}
                      size="md"
                      fallbackText={connection.display_name || "User"}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {connection.display_name || "Anonymous User"}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserRound className="h-3 w-3" />
                        View profile
                      </p>
                    </div>
                  </Link>
                ))}

                {hasMore ? (
                  <Button
                    variant="outline"
                    className="mt-3 h-11 w-full rounded-xl"
                    onClick={() => setPage((current) => current + 1)}
                    disabled={query.isFetching}
                  >
                    {query.isFetching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
