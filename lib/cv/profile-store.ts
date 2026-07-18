import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { list, put } from "@vercel/blob";
import type { Profile } from "@/lib/types";

const BLOB_PATHNAME = "profile.json";
const LOCAL_PATH = join(process.cwd(), "data/profile.json");

export async function getProfile(): Promise<Profile> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: "profile" });
      const blob = blobs.find((b) => b.pathname === BLOB_PATHNAME);
      if (blob) {
        const res = await fetch(blob.url);
        if (res.ok) return res.json() as Promise<Profile>;
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
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } else {
    writeFileSync(LOCAL_PATH, json);
  }
}
