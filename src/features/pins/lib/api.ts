import { apiClient, apiFormData } from "@/lib/api/client";
import type { CreatePinResponse, PinResponse } from "@/types/api";

export function fetchPin(pinId: string, signal?: AbortSignal) {
  return apiClient<PinResponse>(`/api/pins/${encodeURIComponent(pinId)}`, {
    signal,
  });
}

export interface CreatePinInput {
  name: string;
  comment: string;
  lat: number;
  lng: number;
  /** The device's GPS fix that justifies the pin ("you must be there"). */
  userLat: number;
  userLng: number;
  accuracy: number;
  photo?: File | null;
}

export function createPin(input: CreatePinInput) {
  const form = new FormData();
  form.append("name", input.name);
  form.append("comment", input.comment);
  form.append("lat", String(input.lat));
  form.append("lng", String(input.lng));
  form.append("user_lat", String(input.userLat));
  form.append("user_lng", String(input.userLng));
  form.append("accuracy", String(Math.round(input.accuracy)));
  if (input.photo) form.append("photo", input.photo);
  return apiFormData<CreatePinResponse>("/api/pins", form);
}
