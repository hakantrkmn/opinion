import { apiClient, apiFormData } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { PhotoUploadResult } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useUpdateDisplayName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (displayName: string) => {
      return apiClient("/api/profile", {
        method: "PUT",
        body: JSON.stringify({ displayName }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");
      return apiFormData<{ url: string }>("/api/upload", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
      toast.success("Avatar uploaded successfully!");
    },
    onError: (error) => {
      toast.error("Avatar upload failed", { description: error.message });
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient("/api/profile", { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
      toast.success("Avatar deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete avatar", { description: error.message });
    },
  });
}

export function useUploadCommentPhoto() {
  return useMutation({
    mutationFn: async ({
      file,
      commentId,
    }: {
      file: File;
      commentId?: string;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "comment-photo");
      if (commentId) formData.append("commentId", commentId);
      return apiFormData<PhotoUploadResult>("/api/upload", formData);
    },
    onError: (error) => {
      toast.error("Photo upload failed", { description: error.message });
    },
  });
}
