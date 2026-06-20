import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

const SCRIPT_DIR = path.join(
  process.env.HOME || "",
  "Downloads/email-organizer"
);
const PYTHON = path.join(SCRIPT_DIR, "venv/bin/python3");
const SCRIPT = path.join(SCRIPT_DIR, "sync_bills.py");

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value || authCookie.value !== process.env.DASHBOARD_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let category = "all";
  try {
    const body = await request.json();
    if (body.category) category = body.category;
  } catch {
    // no body — default to all
  }

  const args = category === "all" ? [] : [category];

  try {
    const { stdout, stderr } = await execFileAsync(PYTHON, [SCRIPT, ...args], {
      cwd: SCRIPT_DIR,
      timeout: 120_000,
    });

    const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : "");
    const lines = output.split("\n").filter(Boolean);

    // Parse summary from output
    const synced: Record<string, number> = {};
    for (const line of lines) {
      const m = line.match(/(\w+(?:\s+\w+)?)\s+bills:\s+(\d+)\s+entries/);
      if (m) synced[m[1].toLowerCase()] = parseInt(m[2]);
    }

    return NextResponse.json({
      ok: true,
      synced_at: new Date().toISOString(),
      synced,
      output: lines.slice(-10),
    });
  } catch (err) {
    const error = err as { message?: string; stderr?: string; stdout?: string };
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Sync failed",
        detail: error.stderr || error.stdout || "",
      },
      { status: 500 }
    );
  }
}
