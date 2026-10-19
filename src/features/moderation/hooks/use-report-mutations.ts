"use client";

import type { ReportReason, ReportTargetType } from "@/types/userTypes";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiSend } from "@/lib/api/send";

export interface ReportContentInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note?: string;
}

export function useReportContent() {
  return useMutation({
    mutationFn: (input: ReportContentInput) =>
      apiSend<{ ok: boolean }>("/api/reports", {
        method: "POST",
        json: {
          target_type: input.targetType,
          target_id: input.targetId,
          reason: input.reason,
          note: input.note?.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success("Report submitted", {
        description: "Thanks — our team will review it.",
      });
    },
    onError: (error) => {
      toast.error("Failed to submit report", { description: error.message });
    },
  });
}
