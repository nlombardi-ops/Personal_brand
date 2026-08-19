import { NextRequest, NextResponse } from "next/server";
import { getApplications, saveApplications } from "@/lib/cv/applications-store";
import type { Application } from "@/lib/types";

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getApplications());
}

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const app: Application = {
    id: crypto.randomUUID(),
    cv_version_id: body.cv_version_id,
    applied_at: new Date().toISOString(),
    status: body.status ?? "applied",
    notes: body.notes ?? "",
    salary_discussed: body.salary_discussed ?? null,
  };

  const apps = await getApplications();
  apps.push(app);
  await saveApplications(apps);

  return NextResponse.json(app, { status: 201 });
}
