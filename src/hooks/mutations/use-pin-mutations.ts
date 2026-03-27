import { apiClient, apiFormData } from "@/lib/api/client";
import type { CreatePinData, Pin } from "@/types";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function useCreatePin() {
  return useMutation({
    mutationFn: async (data: CreatePinData) => {
      const formData = new FormData();
      formData.append("pinName", data.pinName);
      formData.append("comment", data.comment);
      formData.append("lat", String(data.lat));
      formData.append("lng", String(data.lng));
      if (data.photo) formData.append("photo", data.photo);
      if (data.photoMetadata)
        formData.append("photoMetadata", JSON.stringify(data.photoMetadata));

      const result = await apiFormData<{ pin: Pin }>("/api/pins", formData);
      return result.pin;
    },
    onSuccess: () => {
      toast.success("Pin created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create pin", { description: error.message });
    },
  });
}

export function useDeletePin() {
  return useMutation({
    mutationFn: async (pinId: string) => {
      await apiClient(`/api/pins/${pinId}`, { method: "DELETE" });
      return pinId;
    },
    onSuccess: () => {
      toast.success("Pin deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete pin", { description: error.message });
    },
  });
}
