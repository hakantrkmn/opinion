import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { pinService } from "@/lib/services/pinService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bounds = {
      minLat: Number(searchParams.get("minLat")),
      maxLat: Number(searchParams.get("maxLat")),
      minLng: Number(searchParams.get("minLng")),
      maxLng: Number(searchParams.get("maxLng")),
    };

    const { pins, error } = await pinService.getPins(bounds);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ pins });
  } catch (error) {
    console.error("Pins GET error:", error);
    return NextResponse.json({ error: "Failed to get pins" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const data = {
      pinName: formData.get("pinName") as string,
      comment: formData.get("comment") as string,
      lat: Number(formData.get("lat")),
      lng: Number(formData.get("lng")),
      photo: formData.get("photo") as File | null || undefined,
      photoMetadata: formData.get("photoMetadata")
        ? JSON.parse(formData.get("photoMetadata") as string)
        : undefined,
    };

    const { pin, error } = await pinService.createPin(data, session.user.id);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ pin });
  } catch (error) {
    console.error("Pins POST error:", error);
    return NextResponse.json({ error: "Failed to create pin" }, { status: 500 });
  }
}
