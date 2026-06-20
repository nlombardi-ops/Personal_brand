import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import type { CvVersion } from "../route";

function readVersions(): CvVersion[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data/cv-versions.json"), "utf-8"));
  } catch {
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const version = readVersions().find((v) => v.id === id);
  if (!version) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(version);
}
