import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export interface Application {
  id: string;
  cv_version_id: string;
  applied_at: string;
  status: "applied" | "interview_1" | "interview_2" | "offer" | "rejected" | "ghosted";
  notes: string;
  salary_discussed: number | null;
}

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

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(readApplications());
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

  const apps = readApplications();
  apps.push(app);
  saveApplications(apps);

  return NextResponse.json(app, { status: 201 });
}
