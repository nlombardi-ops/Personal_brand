import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

function readProfile() {
  return JSON.parse(readFileSync(join(process.cwd(), "data/profile.json"), "utf-8"));
}

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(readProfile());
}

export async function PATCH(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates = await request.json();
  const profile = readProfile();
  const merged = { ...profile, ...updates };
  writeFileSync(join(process.cwd(), "data/profile.json"), JSON.stringify(merged, null, 2));
  return NextResponse.json(merged);
}
