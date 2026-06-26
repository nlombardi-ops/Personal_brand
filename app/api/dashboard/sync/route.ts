import { NextRequest, NextResponse } from "next/server";
import { syncBills } from "@/lib/drive/sync";

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value || authCookie.value !== process.env.DASHBOARD_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let category: "all" | "internet" | "community" | "energy" = "all";
  try {
    const body = await request.json();
    if (["internet", "community", "energy"].includes(body.category)) {
      category = body.category;
    }
  } catch {
    // no body — default to all
  }

  try {
    const result = await syncBills(category);
    return NextResponse.json({ ok: true, synced_at: new Date().toISOString(), ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
