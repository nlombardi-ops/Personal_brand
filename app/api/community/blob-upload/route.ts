import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAuth } from "@/lib/community/require-auth";
import { ALLOWED_MIME, MAX_FILE_BYTES } from "@/lib/community/document-defaults";

// Token broker for browser -> Vercel Blob direct uploads (decision
// A1-client-upload). The file bytes never enter this route — only a JSON
// body describing the requested upload. This keeps a real acta scan (~12 MB)
// clear of Vercel's 4.5 MB serverless request-body ceiling, which a server
// multipart route cannot avoid.
export async function POST(request: NextRequest) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Invalid JSON: ${msg}` }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // This route serves TWO callers: the cookie-authenticated browser
        // (generate-client-token) and Vercel's own unauthenticated signed
        // upload-completed callback. requireAuth lives HERE, inside the
        // callback, rather than as the route's first statement — a
        // first-statement check would reject the second caller and trigger
        // five retries (RESEARCH Pitfall 2). The signed-callback caller is
        // authenticated by the SDK itself, not by this cookie check.
        const denied = requireAuth(request);
        if (denied) throw new Error("Unauthorized");

        return {
          allowedContentTypes: ALLOWED_MIME,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
      // onUploadCompleted is intentionally omitted: it never fires against
      // localhost (Vercel cannot reach a dev server), and the browser itself
      // POSTs the metadata to /api/community/documents on upload success — so
      // the Document record write lives in exactly one place.
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
