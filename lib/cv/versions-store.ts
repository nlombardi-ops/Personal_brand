import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { list, put } from "@vercel/blob";
import type { CvVersion } from "@/lib/types";

const BLOB_PATHNAME = "cv-versions.json";
const LOCAL_PATH = join(process.cwd(), "data/cv-versions.json");

export async function getVersions(): Promise<CvVersion[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: "cv-versions" });
      const blob = blobs.find((b) => b.pathname === BLOB_PATHNAME);
      if (blob) {
        const res = await fetch(blob.url);
        if (res.ok) return res.json() as Promise<CvVersion[]>;
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

export async function saveVersions(versions: CvVersion[]): Promise<void> {
  const json = JSON.stringify(versions, null, 2);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(BLOB_PATHNAME, json, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    writeFileSync(LOCAL_PATH, json);
  }
}
