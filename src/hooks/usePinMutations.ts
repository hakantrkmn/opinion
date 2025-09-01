import { useSession } from "@/hooks/useSession";
import { HybridCacheManager } from "@/lib/hybrid-cache-manager";
import { pinService } from "@/lib/supabase/database";
import type { CreatePinData, Pin } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

export const usePinMutations = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const hybridCache = useMemo(
    () => new HybridCacheManager(queryClient),
    [queryClient]
  );

  const createPinMutation = useMutation({
    mutationFn: async (data: CreatePinData) => {
      const { pin, error } = await pinService.createPin(
        data,
        user || undefined
      );
      if (error) throw new Error(error);
      return pin;
    },
    onSuccess: (newPin) => {
      if (newPin) {
        const pinWithCorrectCount = { ...newPin, comment_count: 1 };
        hybridCache.cachePin(pinWithCorrectCount);

        queryClient.setQueriesData(
          { queryKey: ["pins"] },
          (oldData: Pin[] | undefined) => {
            const existingPins = Array.isArray(oldData) ? oldData : [];
            return [pinWithCorrectCount, ...existingPins];
          }
        );

        queryClient.invalidateQueries({ queryKey: ["pins", "bounds"] });
        toast.success("Pin created successfully!");
      }
    },
    onError: (error) => {
      toast.error("Failed to create pin", { description: error.message });
    },
  });

  const deletePinMutation = useMutation({
    mutationFn: async (pinId: string) => {
      const { success, error } = await pinService.deletePin(
        pinId,
        user || undefined
      );
      if (error) throw new Error(error);
      return success;
    },
    onSuccess: (_, pinId) => {
      hybridCache.deletePin(pinId);
      queryClient.setQueriesData(
        { queryKey: ["pins"] },
        (oldData: Pin[] | undefined) => {
          const existingPins = Array.isArray(oldData) ? oldData : [];
          return existingPins.filter((pin) => pin.id !== pinId);
        }
      );
      toast.success("Pin deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete pin", { description: error.message });
    },
  });

  return {
    createPin: async (data: CreatePinData) => {
      try {
        await createPinMutation.mutateAsync(data);
        return true;
      } catch {
        return false;
      }
    },
    deletePin: async (pinId: string) => {
      try {
        await deletePinMutation.mutateAsync(pinId);
        return true;
      } catch {
        return false;
      }
    },
    loading: createPinMutation.isPending || deletePinMutation.isPending,
  };
};
