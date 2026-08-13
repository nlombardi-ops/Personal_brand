import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { list, put } from "@vercel/blob";
import type { VoiceSample } from "@/lib/types";

const BLOB_PATHNAME = "voice-samples.json";
const LOCAL_PATH = join(process.cwd(), "data/voice-samples.json");

export async function getVoiceSamples(): Promise<VoiceSample[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: "voice-samples" });
      const blob = blobs.find((b) => b.pathname === BLOB_PATHNAME);
      if (blob) {
        const res = await fetch(blob.url);
        if (res.ok) {
          const data = (await res.json()) as { samples: VoiceSample[] };
          return data.samples;
        }
      }
    } catch {
      // fall through to local
    }
  }
  const raw = readFileSync(LOCAL_PATH, "utf-8");
  return (JSON.parse(raw) as { samples: VoiceSample[] }).samples;
}

export async function saveVoiceSamples(samples: VoiceSample[]): Promise<void> {
  const json = JSON.stringify({ samples }, null, 2);
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
