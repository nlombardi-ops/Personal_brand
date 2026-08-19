import { NextRequest, NextResponse } from "next/server";
import { getApplications, saveApplications } from "@/lib/cv/applications-store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const updates = await request.json();

  const apps = await getApplications();
  const idx = apps.findIndex((a) => a.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  apps[idx] = { ...apps[idx], ...updates };
  await saveApplications(apps);

  return NextResponse.json(apps[idx]);
}
