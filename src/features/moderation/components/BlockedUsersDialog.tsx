"use client";

import { LoadMore } from "@/features/profile/components/sections/ProfileLists";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogPanel,
} from "@/components/ui/responsive-dialog";
import { ListMessage, UserListSkeleton, UserRow } from "@/features/users/components/UserRow";
import { useUnblockUser } from "@/features/moderation/hooks/use-block-mutations";
import { useBlockedUsers } from "@/features/moderation/hooks/use-blocks";
import { AlertCircle, Loader2, RotateCcw, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";

interface BlockedUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlockedUsersDialog({ open, onOpenChange }: BlockedUsersDialogProps) {
  const t = useTranslations("moderation.blocked");
  const blockedQuery = useBlockedUsers(open);
  const unblockMutation = useUnblockUser();
  const items = blockedQuery.items;

  return (
    <ResponsiveDialog onOpenChange={onOpenChange} open={open}>
      <ResponsiveDialogContent
        desktopClassName="sm:max-w-md"
        mobileClassName="max-h-[85dvh] overflow-hidden"
      >
        <ResponsiveDialogPanel
          title={t("title")}
          description={t("description")}
        >
          <div className="max-h-[60dvh] overflow-y-auto overscroll-contain px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4">
            {blockedQuery.isLoading ? (
              <UserListSkeleton rows={3} />
            ) : blockedQuery.error && items.length === 0 ? (
              <ListMessage
                tone="error"
                icon={<AlertCircle aria-hidden />}
                title={t("loadError")}
                description={blockedQuery.error.message}
                action={
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => void blockedQuery.refetch()}
                  >
                    <RotateCcw aria-hidden />
                    {t("tryAgain")}
                  </Button>
                }
              />
            ) : items.length === 0 ? (
              <ListMessage
                icon={<ShieldOff aria-hidden />}
                title={t("emptyTitle")}
                description={t("emptyDescription")}
              />
            ) : (
              <>
                <ul className="flex flex-col gap-0.5">
                  {items.map((blocked) => {
                    const name = blocked.display_name || t("deletedUser");
                    const isPending =
                      unblockMutation.isPending && unblockMutation.variables === blocked.id;
                    return (
                      <UserRow
                        key={blocked.id}
                        id={blocked.id}
                        name={name}
                        avatarUrl={blocked.avatar_url}
                        onNavigate={() => onOpenChange(false)}
                        action={
                          <Button
                            className="h-9 rounded-lg"
                            disabled={isPending}
                            onClick={() => unblockMutation.mutate(blocked.id)}
                            size="sm"
                            variant="outline"
                            aria-label={t("unblockLabel", { name })}
                          >
                            {isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                            {isPending ? t("unblocking") : t("unblock")}
                          </Button>
                        }
                      />
                    );
                  })}
                </ul>
                <LoadMore {...blockedQuery} className="mt-1" />
              </>
            )}
          </div>
        </ResponsiveDialogPanel>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
