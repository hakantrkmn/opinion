"use client";

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
import { Button } from "@/components/ui/button";
import {
  useBlockUser,
  useUnblockUser,
} from "@/hooks/mutations/use-block-mutations";
import { useBlockedUsers } from "@/hooks/queries/use-blocks";
import { useSession } from "@/hooks/useSession";
import { Flag, Loader2, Shield, ShieldOff } from "lucide-react";
import { useState } from "react";
import { ReportDialog } from "./ReportDialog";

interface UserModerationActionsProps {
  userId: string;
  /** When true, render compact icon-only buttons. */
  compact?: boolean;
}

export function UserModerationActions({
  userId,
  compact = false,
}: UserModerationActionsProps) {
  const { user } = useSession();
  const blockedQuery = useBlockedUsers(!!user);
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  if (!user || user.id === userId) return null;

  const isBlocked = blockedQuery.data?.some((row) => row.id === userId) ?? false;
  const blockBusy = blockMutation.isPending || unblockMutation.isPending;

  const blockButton = (
    <Button
      aria-label={isBlocked ? "Unblock user" : "Block user"}
      className={compact ? "h-9 w-9 rounded-xl p-0" : "h-11 rounded-xl"}
      disabled={blockBusy || blockedQuery.isLoading}
      onClick={() => {
        if (isBlocked) {
          unblockMutation.mutate(userId);
        } else {
          setConfirmBlock(true);
        }
      }}
      size={compact ? "icon" : "sm"}
      title={isBlocked ? "Unblock user" : "Block user"}
      variant="outline"
    >
      {blockBusy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isBlocked ? (
        <ShieldOff className="h-4 w-4" />
      ) : (
        <Shield className="h-4 w-4" />
      )}
      {!compact ? <span>{isBlocked ? "Unblock" : "Block"}</span> : null}
    </Button>
  );

  const reportButton = (
    <Button
      aria-label="Report user"
      className={compact ? "h-9 w-9 rounded-xl p-0" : "h-11 rounded-xl"}
      onClick={() => setReportOpen(true)}
      size={compact ? "icon" : "sm"}
      title="Report user"
      variant="outline"
    >
      <Flag className="h-4 w-4" />
      {!compact ? <span>Report</span> : null}
    </Button>
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {blockButton}
        {reportButton}
      </div>

      <ReportDialog
        onOpenChange={setReportOpen}
        open={reportOpen}
        targetId={userId}
        targetType="user"
      />

      <AlertDialog onOpenChange={setConfirmBlock} open={confirmBlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              You won&apos;t see their pins or comments, and they won&apos;t see
              yours. Any follow relationship will be removed. You can unblock
              them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={blockBusy}
              onClick={() => {
                blockMutation.mutate(userId);
                setConfirmBlock(false);
              }}
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
