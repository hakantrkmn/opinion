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
import { Textarea } from "@/components/ui/textarea";
import { useReportContent } from "@/features/moderation/hooks/use-report-mutations";
import { cn } from "@/lib/utils";
import type { ReportReason, ReportTargetType } from "@/types/userTypes";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
}

const REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: "spam", label: "Spam", hint: "Ads, scams or repeated junk" },
  { value: "harassment", label: "Harassment or hate", hint: "Targets a person or group" },
  { value: "inappropriate", label: "Inappropriate content", hint: "Explicit, violent or illegal" },
  { value: "other", label: "Something else", hint: "Tell us more in the note" },
];

const NOTE_MAX = 500;

export function ReportDialog({ open, onOpenChange, targetType, targetId }: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [note, setNote] = useState("");
  const reportMutation = useReportContent();

  useEffect(() => {
    if (open) {
      setReason("spam");
      setNote("");
    }
  }, [open]);

  const needsNote = reason === "other" && !note.trim();
  const pending = reportMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || needsNote) return;
    try {
      await reportMutation.mutateAsync({
        targetType,
        targetId,
        reason,
        note: note.trim() ? note.trim() : undefined,
      });
      onOpenChange(false);
    } catch {
      // The mutation shows the error toast.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      {/* Opened from pin sheets / profiles, so it stacks above other dialogs. */}
      <DialogContent
        className="z-(--z-dialog-nested) max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:max-w-md"
        overlayClassName="z-(--z-dialog-nested)"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Report this {targetType}</DialogTitle>
            <DialogDescription>
              Reports are private. Moderators review them and remove anything that breaks the rules.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Why are you reporting it?</legend>
            {REASONS.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-150 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                  reason === r.value ? "border-foreground/40 bg-muted/60" : "border-border hover:bg-muted/40"
                )}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="size-4 shrink-0 accent-primary"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="report-note">
                Note {reason === "other" ? null : <span className="font-normal text-muted-foreground">(optional)</span>}
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {note.length}/{NOTE_MAX}
              </span>
            </div>
            <Textarea
              id="report-note"
              maxLength={NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything that helps moderators understand the problem"
              rows={3}
              value={note}
              aria-invalid={needsNote && note.length > 0 ? true : undefined}
              aria-describedby={reason === "other" ? "report-note-hint" : undefined}
              className="rounded-xl"
            />
            {reason === "other" ? (
              <p id="report-note-hint" className="text-xs text-muted-foreground">
                Add a short note so moderators know what&apos;s wrong.
              </p>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button
              disabled={pending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
              className="h-10 rounded-xl"
            >
              Cancel
            </Button>
            <Button disabled={pending || needsNote} type="submit" className="h-10 rounded-xl">
              {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
              {pending ? "Sending…" : "Send report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
