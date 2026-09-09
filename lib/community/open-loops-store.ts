import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { get, put } from "@vercel/blob";
import type { OpenLoop } from "@/lib/types";

const BLOB_PATHNAME = "community-open-loops.json";
const LOCAL_PATH = join(process.cwd(), "data/community-open-loops.json");

export async function getOpenLoops(): Promise<OpenLoop[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // useCache: false bypasses Vercel's CDN cache layer — needed because
      // the pathname is stable (addRandomSuffix: false), so the CDN would
      // otherwise keep serving the pre-save copy after every write.
      const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
      if (result) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as OpenLoop[];
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

export async function saveOpenLoops(loops: OpenLoop[]): Promise<void> {
  const json = JSON.stringify(loops, null, 2);
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
