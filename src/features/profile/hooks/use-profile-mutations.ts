"use client";

import { apiFormData } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { authClient } from "@/lib/auth-client";
import type { UploadResponse } from "@/types/api";
import type { OwnProfileResponse, OwnUserProfile } from "@/types/userTypes";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api/send";

function patchOwnProfile(
  queryClient: ReturnType<typeof useQueryClient>,
  patch: Partial<OwnUserProfile>
) {
  queryClient.setQueryData<OwnProfileResponse>(queryKeys.profile.me, (old) =>
    old ? { ...old, profile: { ...old.profile, ...patch } } : old
  );
}

/** PATCH /api/profile { display_name }. Errors are shown inline by the caller. */
export function useUpdateDisplayName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (displayName: string) =>
      apiSend<{ profile: OwnUserProfile }>("/api/profile", {
        method: "PATCH",
        json: { display_name: displayName },
      }),
    onSuccess: ({ profile }) => {
      patchOwnProfile(queryClient, profile);
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(profile.id) });
      toast.success("Display name updated");
    },
  });
}

/** POST /api/upload type=avatar (server re-encodes to a 512px WebP). */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");
      return apiFormData<UploadResponse>("/api/upload", formData);
    },
    onSuccess: (data) => {
      patchOwnProfile(queryClient, { avatar_url: data.url });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
      toast.success("Avatar updated");
    },
    onError: (error) => {
      toast.error("Avatar upload failed", { description: error.message });
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend("/api/profile/avatar", { method: "DELETE" }),
    onSuccess: () => {
      patchOwnProfile(queryClient, { avatar_url: null });
      toast.success("Avatar removed");
    },
    onError: (error) => {
      toast.error("Couldn't remove avatar", { description: error.message });
    },
  });
}

/** POST /api/upload type=comment-photo → UploadResponse. */
export function useUploadCommentPhoto() {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "comment-photo");
      return apiFormData<UploadResponse>("/api/upload", formData);
    },
    onError: (error) => {
      toast.error("Photo upload failed", { description: error.message });
    },
  });
}

/**
 * DELETE /api/profile/account { password }. On success the server has
 * revoked every session; clear local state and go home.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (password: string) =>
      apiSend("/api/profile/account", { method: "DELETE", json: { password } }),
    onSuccess: async () => {
      await authClient.signOut().catch(() => undefined);
      queryClient.clear();
      toast.success("Your account has been deleted");
      router.replace("/");
      router.refresh();
    },
    // Errors (e.g. wrong password) are shown inline by the dialog.
  });
}
