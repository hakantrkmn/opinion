"use client";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import type { ReportTargetType } from "@/types";
import { Flag } from "lucide-react";
import { useState } from "react";
import { ReportDialog } from "./ReportDialog";

interface ReportContentButtonProps {
  targetType: Extract<ReportTargetType, "pin" | "comment">;
  targetId: string;
  ownerId: string;
  /** Compact icon-only button (use inside dense layouts like comment cards). */
  compact?: boolean;
  className?: string;
}

export function ReportContentButton({
  targetType,
  targetId,
  ownerId,
  compact = false,
  className,
}: ReportContentButtonProps) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);

  if (!user || user.id === ownerId) return null;

  const label = targetType === "pin" ? "Report pin" : "Report comment";

  return (
    <>
      <Button
        aria-label={label}
        className={
          className ??
          (compact
            ? "h-7 w-7 rounded-lg p-0 text-muted-foreground hover:text-destructive sm:h-8 sm:w-8"
            : "h-10 rounded-xl border-border/60 text-xs font-medium")
        }
        onClick={() => setOpen(true)}
        size={compact ? "icon" : "sm"}
        title={label}
        variant={compact ? "ghost" : "outline"}
      >
        <Flag className={compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} />
        {!compact ? <span>Report</span> : null}
      </Button>

      <ReportDialog
        onOpenChange={setOpen}
        open={open}
        targetId={targetId}
        targetType={targetType}
      />
    </>
  );
}
