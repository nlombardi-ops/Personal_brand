import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";

// Serves a CV PDF stored as a private Vercel Blob — a private blob's URL
// isn't directly fetchable by the browser, so this proxies it server-side
// using the same access pattern as lib/cv/versions-store.ts.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await get(`cvs/${id}.pdf`, { access: "private", useCache: false });
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cv-${id}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
