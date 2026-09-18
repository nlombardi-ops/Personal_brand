import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { get, put } from "@vercel/blob";
import type { Document } from "@/lib/types";

// This JSON document holds metadata only. The uploaded file bytes live at
// `community-documents/{uuid}.{ext}`, written by the browser's direct-to-Blob
// upload() call (see app/components/community/DocumentUpload.tsx) — never by
// saveDocuments.
const BLOB_PATHNAME = "community-documents.json";
const LOCAL_PATH = join(process.cwd(), "data/community-documents.json");

export async function getDocuments(): Promise<Document[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // useCache: false bypasses Vercel's CDN cache layer — needed because
      // the pathname is stable (addRandomSuffix: false), so the CDN would
      // otherwise keep serving the pre-save copy after every write.
      const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
      if (result) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as Document[];
      }
    } catch {
      // fall through to local
    }
  }
  try {
    return JSON.parse(readFileSync(LOCAL_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export async function saveDocuments(docs: Document[]): Promise<void> {
  const json = JSON.stringify(docs, null, 2);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_PATHNAME, json, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    writeFileSync(LOCAL_PATH, json);
  }
}
