import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/community/require-auth";
import { getDocuments, saveDocuments } from "@/lib/community/documents-store";
import { getOpenLoops } from "@/lib/community/open-loops-store";
import {
  applyDocumentCreateDefaults,
  classifyFile,
  validateDocumentInput,
} from "@/lib/community/document-defaults";
import type { Document } from "@/lib/types";

// A document is removed by a status change (D-06), never by a removal
// endpoint — no DELETE is exported here or anywhere under app/api/community/.

export async function GET(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  return NextResponse.json(await getDocuments());
}

export async function POST(request: NextRequest) {
  const denied = requireAuth(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const invalid = validateDocumentInput(body, { create: true });
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const { original_name, content_type, linked_loop_id } = body as {
    original_name: string;
    content_type: string;
    linked_loop_id?: string | null;
  };

  // file_kind and the stored content_type are ALWAYS derived here, server-side
  // — re-running the same gate the browser ran, never taking the client's word
  // for it (T-02-02).
  const classified = classifyFile(original_name, content_type);
  if (!classified) {
    return NextResponse.json(
      { error: "El tipo de archivo no está admitido." },
      { status: 400 },
    );
  }

  if (linked_loop_id) {
    const loops = await getOpenLoops();
    if (!loops.some((loop) => loop.id === linked_loop_id)) {
      return NextResponse.json(
        { error: "El bucle vinculado no existe." },
        { status: 400 },
      );
    }
  }

  try {
    const now = new Date().toISOString();
    const doc: Document = {
      id: crypto.randomUUID(),
      uploaded_at: now,
      updated_at: now,
      ...applyDocumentCreateDefaults(body as Record<string, unknown>, classified),
    };

    const docs = await getDocuments();
    docs.push(doc);
    await saveDocuments(docs);

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    // Never log the request body — filenames and titles can contain neighbour names (ASVS V7).
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to save document: ${msg}` },
      { status: 500 },
    );
  }
}
