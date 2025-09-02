import { useSession } from "@/hooks/useSession";
import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { pinService } from "@/lib/supabase/database";
import type { Pin } from "@/types"; // Pin tipini import et
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { pinQueryKeys } from "../constants/mapConstants";

export const useCommentMutations = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const hybridCache = useMemo(
    () => new HybridCacheManager(queryClient),
    [queryClient]
  );

  const addCommentMutation = useMutation({
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
      const { comment, error } = await pinService.addComment(
        pinId,
        text,
        user || undefined,
        photoUrl,
        photoMetadata
      );
      if (error) throw new Error(error);
      return { comment, pinId };
    },
    onSuccess: ({ comment, pinId }) => {
      if (comment) {
        hybridCache.updateCommentCountInCache(pinId, 1);
        queryClient.invalidateQueries({
          queryKey: pinQueryKeys.comments(pinId),
        });
        // ✅ any yerine Pin[] kullan
        queryClient.setQueriesData(
          { queryKey: ["pins"] },
          (oldData: Pin[] | undefined) => {
            const existingPins = Array.isArray(oldData) ? oldData : [];
            return existingPins.map((pin: Pin) =>
              pin.id === pinId
                ? { ...pin, comments_count: (pin.comments_count || 0) + 1 }
                : pin
            );
          }
        );
        toast.success("Comment added successfully!");
      }
    },
    onError: (error) => {
      toast.error("Failed to add comment", { description: error.message });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      newText,
      photoUrl,
      photoMetadata,
    }: {
      commentId: string;
      newText: string;
      photoUrl?: string | null;
      photoMetadata?: Record<string, unknown>;
    }) => {
      const { success, error } = await pinService.updateComment(
        commentId,
        newText,
        user || undefined,
        photoUrl,
        photoMetadata
      );
      if (error) throw new Error(error);
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...pinQueryKeys.all, "comments"],
      });
      toast.success("Comment updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update comment", { description: error.message });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const result = await pinService.deleteCommentWithCleanup(
        commentId,
        user || undefined
      );
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: ({ success, pinDeleted, pinId }) => {
      console.log("deleteComment onSuccess called:", {
        success,
        pinDeleted,
        pinId,
      });
      if (success && pinId) {
        if (pinDeleted) {
          hybridCache.deletePin(pinId);
          // ✅ any yerine Pin[] kullan
          queryClient.setQueriesData(
            { queryKey: ["pins"] },
            (oldData: Pin[] | undefined) => {
              const existingPins = Array.isArray(oldData) ? oldData : [];
              return existingPins.filter((pin: Pin) => pin.id !== pinId);
            }
          );
          toast.success("Pin deleted after removing last comment");
        } else {
          // Pin'in comment_count'unu cache'de güncelle
          queryClient.setQueriesData(
            { queryKey: ["pins"] },
            (oldData: Pin[] | undefined) => {
              const existingPins = Array.isArray(oldData) ? oldData : [];
              return existingPins.map((pin: Pin) =>
                pin.id === pinId
                  ? { ...pin, comments_count: Math.max(0, (pin.comments_count || 1) - 1) }
                  : pin
              );
            }
          );
          toast.success("Comment deleted successfully!");
        }
        queryClient.invalidateQueries({
          queryKey: pinQueryKeys.comments(pinId),
        });
        // HybridCache'den de pin comments'i temizle
        hybridCache.invalidatePinComments(pinId);
        // Pin'leri de refresh et ki map'te güncel count görünsün
        queryClient.invalidateQueries({
          queryKey: ["pins"],
        });
      }
    },
    onError: (error, pinId) => {
      console.log("deleteCommentMutation", error);
      toast.error("Failed to delete comment", { description: error.message });
    },
  });

  const voteCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      value,
    }: {
      commentId: string;
      value: number;
    }) => {
      const { success, error } = await pinService.voteComment(
        commentId,
        value,
        user || undefined
      );
      if (error) throw new Error(error);
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...pinQueryKeys.all, "comments"],
      });
    },
    onError: (error) => {
      toast.error("Failed to vote on comment", { description: error.message });
    },
  });

  return {
    addComment: async (
      pinId: string,
      text: string,
      photoUrl?: string,
      photoMetadata?: Record<string, unknown>
    ) => {
      try {
        await addCommentMutation.mutateAsync({
          pinId,
          text,
          photoUrl,
          photoMetadata,
        });
        return true;
      } catch {
        return false;
      }
    },
    editComment: async (
      commentId: string,
      newText: string,
      photoUrl?: string | null,
      photoMetadata?: Record<string, unknown>
    ) => {
      try {
        await editCommentMutation.mutateAsync({
          commentId,
          newText,
          photoUrl,
          photoMetadata,
        });
        return true;
      } catch {
        return false;
      }
    },
    deleteComment: async (commentId: string) => {
      try {
        await deleteCommentMutation.mutateAsync(commentId);
        return true;
      } catch {
        return false;
      }
    },
    voteComment: async (commentId: string, value: number) => {
      try {
        await voteCommentMutation.mutateAsync({ commentId, value });
        return true;
      } catch {
        return false;
      }
    },
    loading:
      addCommentMutation.isPending ||
      editCommentMutation.isPending ||
      deleteCommentMutation.isPending ||
      voteCommentMutation.isPending,
  };
};
