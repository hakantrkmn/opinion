"use client";

import { queryKeys } from "@/lib/api/query-keys";
import type { PinCommentsResponse } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPin, type CreatePinInput } from "../lib/api";
import { addCachedPin } from "../lib/cache";

/**
 * Creates a pin. Errors are NOT toasted here: the create dialog shows them
 * inline (incl. the TOO_FAR case) and keeps the form filled.
 */
export function useCreatePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePinInput) => createPin(input),
    onSuccess: ({ pin, comment }) => {
      addCachedPin(queryClient, pin);
      const seeded: PinCommentsResponse = {
        comments: [comment],
        has_more: false,
        total: 1,
        my_comment_id: comment.id,
      };
      for (const sort of ["popular", "newest", "oldest"]) {
        queryClient.setQueryData(queryKeys.pins.comments(pin.id, sort), {
          pages: [seeded],
          pageParams: [0],
        });
      }
      toast.success("Pin dropped", { description: pin.name });
    },
  });
}
