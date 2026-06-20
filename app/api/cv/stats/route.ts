import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import type { Application } from "../applications/route";

function read<T>(file: string): T[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), file), "utf-8"));
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const versions = read<{ id: string }>("data/cv-versions.json");
  const apps = read<Application>("data/applications.json");

  const total = apps.length;
  const interviews = apps.filter((a) =>
    ["interview_1", "interview_2", "offer"].includes(a.status)
  ).length;
  const offers = apps.filter((a) => a.status === "offer").length;
  const ghosted = apps.filter((a) => a.status === "ghosted").length;

  return NextResponse.json({
    cvs_generated: versions.length,
    applications_submitted: total,
    interview_rate: total > 0 ? Math.round((interviews / total) * 100) : 0,
    offer_rate: total > 0 ? Math.round((offers / total) * 100) : 0,
    ghosted_count: ghosted,
  });
}
