"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { useUnblockUser } from "@/hooks/mutations/use-block-mutations";
import { useBlockedUsers } from "@/hooks/queries/use-blocks";
import { Loader2, ShieldOff } from "lucide-react";
import Link from "next/link";

interface BlockedUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlockedUsersDialog({
  open,
  onOpenChange,
}: BlockedUsersDialogProps) {
  const blockedQuery = useBlockedUsers(open);
  const unblockMutation = useUnblockUser();
  const items = blockedQuery.data ?? [];

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent
        desktopClassName="max-w-xl"
        mobileClassName="max-h-[85dvh] overflow-hidden"
      >
        <ResponsiveDialogPanel
          description="People you've blocked won't see your content, and you won't see theirs."
          title="Blocked users"
        >
          <div className="max-h-[60dvh] overflow-y-auto px-5 pb-5 sm:px-6">
            {blockedQuery.isLoading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-2xl bg-muted/40 p-4">
                  <ShieldOff className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    You haven&apos;t blocked anyone
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Blocked accounts will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((blocked) => {
                  const name =
                    blocked.displayName || blocked.name || "Anonymous";
                  const avatar = blocked.avatarUrl || blocked.image || undefined;
                  const isPending =
                    unblockMutation.isPending &&
                    unblockMutation.variables === blocked.id;

                  return (
                    <div
                      className="flex items-center gap-3 rounded-2xl border border-border/50 px-4 py-3"
                      key={blocked.id}
                    >
                      <Link
                        className="flex min-w-0 flex-1 items-center gap-3"
                        href={`/u/${blocked.id}`}
                        onClick={() => onOpenChange(false)}
                      >
                        <Avatar
                          alt={name}
                          fallbackText={name}
                          size="md"
                          src={avatar ?? undefined}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            View profile
                          </p>
                        </div>
                      </Link>
                      <Button
                        className="h-9 rounded-xl"
                        disabled={isPending}
                        onClick={() => unblockMutation.mutate(blocked.id)}
                        size="sm"
                        variant="outline"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Unblocking…</span>
                          </>
                        ) : (
                          "Unblock"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
