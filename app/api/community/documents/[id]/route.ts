import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/community/require-auth";
import { getDocuments, saveDocuments } from "@/lib/community/documents-store";
import { applyDocumentPatch, validateDocumentInput } from "@/lib/community/document-defaults";

// Only PATCH is exported. Next returns 405 for every other verb automatically,
// and there is deliberately NO removal endpoint on this resource: archiving a
// document is a status change (D-06), not a deletion. This id-scoped route is
// the ONLY mutation path for an existing document — inline type/title/date
// edits, archiving, and (Slice 2) attach/detach all go through it, so every
// write re-runs the same validator and the same frozen-key overlay and there
// is nowhere to bypass the caps.
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Non-create mode: every supplied field is re-checked against the same caps
  // and enum allow-lists as create — an edit is not a way around them.
  const invalid = validateDocumentInput(body, { create: false });
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  try {
    const docs = await getDocuments();
    const index = docs.findIndex((doc) => doc.id === id);
    if (index === -1) {
      // Nothing is written on a miss — the document stays byte-identical.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = applyDocumentPatch(docs[index], body as Record<string, unknown>);
    docs[index] = updated;
    await saveDocuments(docs);

    return NextResponse.json(updated);
  } catch (err) {
    // Never log the request body — filenames and titles can contain neighbour names (ASVS V7).
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save document: ${msg}` },
      { status: 500 },
    );
  }
}
