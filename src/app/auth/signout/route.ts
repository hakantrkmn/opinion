import { getBaseUrl } from "@/lib/site-url";
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.redirect(new URL("/auth", getBaseUrl()));
}
