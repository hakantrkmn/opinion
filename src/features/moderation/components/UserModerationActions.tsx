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
  const { user } = useSession();
  const blockedQuery = useBlockedUsers(!!user && isBlockedProp === undefined);
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  if (!user || user.id === userId) return null;

  const isBlocked = isBlockedProp ?? blockedQuery.items.some((row) => row.id === userId);
  const blockBusy = blockMutation.isPending || unblockMutation.isPending;
  const who = userName || "this user";

  return (
    <>
      <ActionMenu
        label="More actions"
        triggerClassName={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-10 rounded-xl aria-expanded:bg-accent",
          className
        )}
        trigger={<MoreHorizontal aria-hidden />}
        items={[
          { label: "Report user", icon: Flag, onSelect: () => setReportOpen(true) },
          isBlocked
            ? {
                label: "Unblock",
                icon: ShieldOff,
                disabled: blockBusy,
                onSelect: () => unblockMutation.mutate(userId),
              }
            : {
                label: "Block",
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
            <AlertDialogTitle>Block {who}?</AlertDialogTitle>
            <AlertDialogDescription>
              You won&apos;t see each other&apos;s pins or comments, and any follows between you
              are removed. You can unblock them any time from Settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => blockMutation.mutate(userId)}
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
