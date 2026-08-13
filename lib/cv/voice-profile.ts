import { readFileSync } from "fs";
import { join } from "path";

const PROFILE_PATH = join(process.cwd(), "docs/voice-profile.md");

export function getVoiceProfileGuide(): string | null {
  try {
    return readFileSync(PROFILE_PATH, "utf-8");
  } catch {
    return null;
  }
}
