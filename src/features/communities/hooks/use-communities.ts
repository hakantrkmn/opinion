"use client";

import { useSession } from "@/features/auth/hooks/useSession";
import { usePaginatedQuery } from "@/hooks/use-paginated";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { apiSend } from "@/lib/api/send";
import type {
  CommunityInviteResponse,
  CommunityInvitePreview,
  CommunityListResponse,
  CommunityMember,
  CommunityResponse,
} from "@/types/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const base = (id: string) => `/api/communities/${encodeURIComponent(id)}`;

/** The viewer's communities (empty and idle when signed out). */
export function useMyCommunities() {
  const { user } = useSession();
  return useQuery({
    queryKey: queryKeys.communities.mine,
    queryFn: ({ signal }) => apiClient<CommunityListResponse>("/api/communities", { signal }),
    enabled: !!user,
    staleTime: 60_000,
    select: (data) => data.items,
  });
}

export function useCommunity(id: string) {
  return useQuery({
    queryKey: queryKeys.communities.detail(id),
    queryFn: ({ signal }) => apiClient<CommunityResponse>(base(id), { signal }),
    select: (data) => data.community,
    retry: (count, error) => (error as { status?: number }).status !== 404 && count < 2,
  });
}

export function useCommunityMembers(id: string, enabled = true) {
  return usePaginatedQuery<CommunityMember>({
    queryKey: queryKeys.communities.members(id),
    url: `${base(id)}/members`,
    limit: 30,
    enabled,
  });
}

export function useInvitePreview(code: string) {
  return useQuery({
    queryKey: queryKeys.communities.invite(code),
    queryFn: ({ signal }) =>
      apiClient<CommunityInvitePreview>(
        `/api/communities/invites/${encodeURIComponent(code)}`,
        { signal }
      ),
    retry: (count, error) => (error as { status?: number }).status !== 404 && count < 2,
  });
}

/**
 * Anything that changes membership: refresh communities, and the map / comment
 * lists, which may be filtered by one of them.
 */
function useInvalidateCommunities() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.pins.all });
  };
}

export function useCreateCommunity() {
  const invalidate = useInvalidateCommunities();
  return useMutation({
    mutationFn: (input: { name: string; description: string | null }) =>
      apiSend<CommunityResponse>("/api/communities", { method: "POST", json: input }),
    onSuccess: invalidate,
  });
}

export function useUpdateCommunity(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description: string | null }) =>
      apiSend<CommunityResponse>(base(id), { method: "PATCH", json: input }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.communities.detail(id), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.mine });
    },
  });
}

export function useDeleteCommunity(id: string) {
  const invalidate = useInvalidateCommunities();
  return useMutation({
    mutationFn: () => apiSend(base(id), { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useResetInvite(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend<CommunityInviteResponse>(`${base(id)}/invite`, { method: "POST" }),
    onSuccess: ({ invite_code }) => {
      queryClient.setQueryData<CommunityResponse>(queryKeys.communities.detail(id), (prev) =>
        prev ? { community: { ...prev.community, invite_code } } : prev
      );
    },
  });
}

/** The founder removes `userId`, or a member passes their own id to leave. */
export function useRemoveMember(id: string) {
  const invalidate = useInvalidateCommunities();
  return useMutation({
    mutationFn: (userId: string) =>
      apiSend(`${base(id)}/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export function useJoinCommunity(code: string) {
  const invalidate = useInvalidateCommunities();
  return useMutation({
    mutationFn: () =>
      apiSend<CommunityResponse>(`/api/communities/invites/${encodeURIComponent(code)}`, {
        method: "POST",
      }),
    onSuccess: invalidate,
  });
}
