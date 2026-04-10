import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useAddComment() {
  return useMutation({
    mutationFn: async ({
      pinId,
      text,
      photoUrl,
      photoMetadata,
    }: {
      pinId: string;
      text: string;
      photoUrl?: string;
      photoMetadata?: Record<string, unknown>;
    }) => {
      return apiClient<{ comment: unknown }>(`/api/pins/${pinId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text, photoUrl, photoMetadata }),
      });
    },
    onSuccess: () => {
      toast.success("Comment added successfully!");
    },
    onError: (error) => {
      toast.error("Failed to add comment", { description: error.message });
    },
  });
}

export function useEditComment() {
  return useMutation({
    mutationFn: async ({
      commentId,
      text,
      photoUrl,
      photoMetadata,
    }: {
      commentId: string;
      text: string;
      pinId: string;
      photoUrl?: string | null;
      photoMetadata?: Record<string, unknown>;
    }) => {
      return apiClient(`/api/pins/comments/${commentId}`, {
        method: "PUT",
        body: JSON.stringify({ text, photoUrl, photoMetadata }),
      });
    },
    onSuccess: () => {
      toast.success("Comment updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update comment", { description: error.message });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
    }: {
      commentId: string;
      pinId: string;
    }) => {
      return apiClient<{
        success: boolean;
        pinDeleted: boolean;
        pinId?: string;
      }>(`/api/pins/comments/${commentId}/cleanup`, {
        method: "DELETE",
      });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.pins });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.comments });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.stats });
      if (result.pinDeleted) {
        toast.success("Pin deleted after removing last comment");
      } else {
        toast.success("Comment deleted successfully!");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete comment", { description: error.message });
    },
  });
}

export function useVoteComment() {
  return useMutation({
    mutationFn: async ({
      commentId,
      value,
    }: {
      commentId: string;
      value: number;
      pinId: string;
    }) => {
      return apiClient(`/api/pins/comments/${commentId}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      });
    },
    onError: (error) => {
      toast.error("Failed to vote", { description: error.message });
    },
  });
}
