import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { get, put } from "@vercel/blob";
import type { Profile } from "@/lib/types";

const BLOB_PATHNAME = "profile.json";
const LOCAL_PATH = join(process.cwd(), "data/profile.json");

export async function getProfile(): Promise<Profile> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // useCache: false bypasses Vercel's CDN cache layer — needed because
      // the pathname is stable (addRandomSuffix: false), so the CDN would
      // otherwise keep serving the pre-save copy after every write.
      const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
      if (result) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as Profile;
      }
    } catch {
      // fall through to local
    }
  }
  const raw = readFileSync(LOCAL_PATH, "utf-8");
  return JSON.parse(raw) as Profile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const json = JSON.stringify(profile, null, 2);
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
