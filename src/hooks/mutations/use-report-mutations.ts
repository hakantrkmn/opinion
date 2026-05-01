"use client";

import { apiClient } from "@/lib/api/client";
import type { ReportReason, ReportTargetType } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ReportContentInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  note?: string;
}

export function useReportContent() {
  return useMutation({
    mutationFn: async (input: ReportContentInput) =>
      apiClient<{ ok: boolean }>("/api/reports", {
        method: "POST",
        body: JSON.stringify(input),
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
