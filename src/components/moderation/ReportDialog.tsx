"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReportContent } from "@/hooks/mutations/use-report-mutations";
import type { ReportReason, ReportTargetType } from "@/types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
}

const REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment or hate",
  inappropriate: "Inappropriate content",
  other: "Other",
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  pin: "pin",
  comment: "comment",
  user: "user",
};

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [note, setNote] = useState("");
  const reportMutation = useReportContent();

  useEffect(() => {
    if (open) {
      setReason("spam");
      setNote("");
    }
  }, [open]);

  const handleSubmit = async () => {
    try {
      await reportMutation.mutateAsync({
        targetType,
        targetId,
        reason,
        note: note.trim() ? note.trim() : undefined,
      });
      onOpenChange(false);
    } catch {
      // toast is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[90]" overlayClassName="z-[85]">
        <DialogHeader>
          <DialogTitle>Report this {TARGET_LABELS[targetType]}</DialogTitle>
          <DialogDescription>
            Help us keep the community safe. Reports are reviewed by our team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason</Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as ReportReason)}
            >
              <SelectTrigger id="report-reason" className="w-full">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="z-[95]">
                {(Object.keys(REASON_LABELS) as ReportReason[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {REASON_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-note">Add a note (optional)</Label>
            <Textarea
              id="report-note"
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Share any extra context that helps moderators."
              rows={4}
              value={note}
            />
            <p className="text-right text-xs text-muted-foreground">
              {note.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={reportMutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={reportMutation.isPending}
            onClick={handleSubmit}
            type="button"
          >
            {reportMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
