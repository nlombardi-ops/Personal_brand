import { NextRequest, NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/cv/profile-store";

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getProfile());
}

export async function PATCH(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates = await request.json();
  const profile = await getProfile();
  const merged = { ...profile, ...updates };
  await saveProfile(merged);
  return NextResponse.json(merged);
}
