"use client";

import { ActionMenu } from "@/features/profile/components/action-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  useBlockUser,
  useUnblockUser,
} from "@/features/moderation/hooks/use-block-mutations";
import { useBlockedUsers } from "@/features/moderation/hooks/use-blocks";
import { useSession } from "@/features/auth/hooks/useSession";
import { cn } from "@/lib/utils";
import { Ban, Flag, MoreHorizontal, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ReportDialog } from "@/features/moderation/components/ReportDialog";

interface UserModerationActionsProps {
  userId: string;
  userName?: string;
  /**
   * Whether the viewer has blocked this user, when already known (e.g. from
   * GET /api/users/:id → viewer.is_blocked). Otherwise the block list is
   * fetched.
   */
  isBlocked?: boolean;
  className?: string;
}

/** "⋯" menu on a profile: report and block / unblock (block is confirmed). */
export function UserModerationActions({
  userId,
  userName,
  isBlocked: isBlockedProp,
  className,
}: UserModerationActionsProps) {
  const t = useTranslations("moderation.userActions");
  const { user } = useSession();
  const blockedQuery = useBlockedUsers(!!user && isBlockedProp === undefined);
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  if (!user || user.id === userId) return null;

  const isBlocked = isBlockedProp ?? blockedQuery.items.some((row) => row.id === userId);
  const blockBusy = blockMutation.isPending || unblockMutation.isPending;
  const who = userName || t("thisUser");

  return (
    <>
      <ActionMenu
        label={t("more")}
        triggerClassName={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-10 rounded-xl aria-expanded:bg-accent",
          className
        )}
        trigger={<MoreHorizontal aria-hidden />}
        items={[
          { label: t("report"), icon: Flag, onSelect: () => setReportOpen(true) },
          isBlocked
            ? {
                label: t("unblock"),
                icon: ShieldOff,
                disabled: blockBusy,
                onSelect: () => unblockMutation.mutate(userId),
              }
            : {
                label: t("block"),
                icon: Ban,
                destructive: true,
                disabled: blockBusy || (isBlockedProp === undefined && blockedQuery.isLoading),
                onSelect: () => setConfirmBlock(true),
              },
        ]}
      />

      <ReportDialog onOpenChange={setReportOpen} open={reportOpen} targetId={userId} targetType="user" />

      <AlertDialog onOpenChange={setConfirmBlock} open={confirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle", { name: who })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => blockMutation.mutate(userId)}
            >
              {t("block")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
