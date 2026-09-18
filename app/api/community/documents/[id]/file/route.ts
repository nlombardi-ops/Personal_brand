import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { requireAuth } from "@/lib/community/require-auth";
import { getDocuments } from "@/lib/community/documents-store";
import { sanitizeFilename, serveContentType } from "@/lib/community/document-defaults";

// Private-blob streaming proxy, served for viewing, not for download (D-09).
// Takes a Document id only — never a path or URL from the caller — looks up
// the server-stored blob_pathname, and streams it. This is what keeps the
// route from becoming a fetch-anything endpoint (T-02-04).
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const { id } = await ctx.params;

  const doc = (await getDocuments()).find((d) => d.id === id);
  // 404 on archived too, not just hidden from the list — archiving must kill
  // the download, not merely the listing (D-06).
  if (!doc || doc.status === "archived") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await get(doc.blob_pathname, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filename = sanitizeFilename(doc.title);
    const disposition = filename
      ? `inline; filename="${filename}"`
      : "inline";

    // Stream, never buffer — a 15 MB in-memory copy per request is avoidable
    // pressure.
    return new NextResponse(result.stream, {
      headers: {
        // Our own validated map (T-02-02), never the value the storage SDK
        // reports for the object — a spoofed stored media type must not be
        // able to drive an inline render.
        "Content-Type": serveContentType(doc),
        "Content-Disposition": disposition,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    // Never log the request body.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
