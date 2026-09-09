import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Strong per-request auth gate for every /api/community/* handler.
 *
 * Returns a 401 NextResponse to return early, or null when the request is
 * authorised. Call it as the literal first statement of each verb, before any
 * body parse or store read.
 *
 * The comparison is exact — no trim, no case folding, no prefix match — so a
 * prefix or superstring of the real token is rejected. The middle clause is the
 * fail-closed hardening the contracts-chat analog lacks (RESEARCH Pitfall 1):
 * with the env token unset it must reject, not compare undefined to undefined.
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const token = request.cookies.get("dashboard_auth")?.value;
  if (
    !token ||
    !process.env.DASHBOARD_TOKEN ||
    token !== process.env.DASHBOARD_TOKEN
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
