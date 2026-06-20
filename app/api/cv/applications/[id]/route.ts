import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { Application } from "../route";

function readApplications(): Application[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data/applications.json"), "utf-8"));
  } catch {
    return [];
  }
}

function saveApplications(apps: Application[]) {
  writeFileSync(join(process.cwd(), "data/applications.json"), JSON.stringify(apps, null, 2));
}

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

  const apps = readApplications();
  const idx = apps.findIndex((a) => a.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  apps[idx] = { ...apps[idx], ...updates };
  saveApplications(apps);

  return NextResponse.json(apps[idx]);
}
