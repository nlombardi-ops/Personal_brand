import { NextRequest, NextResponse } from "next/server";
import { getVersions } from "@/lib/cv/versions-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const version = (await getVersions()).find((v) => v.id === id);
  if (!version) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(version);
}
