import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/cv/profile-store";
import { getApplications } from "@/lib/cv/applications-store";
import { getVersions } from "@/lib/cv/versions-store";
import { getVoiceSamples } from "@/lib/cv/voice-store";

/**
 * Exports the live CV Builder state (wherever it actually lives — Vercel Blob
 * in production, local data/*.json in dev) as one JSON blob.
 *
 * Consumed by scripts/sync-context.sh, which writes the result back into
 * data/*.json and commits+pushes — so GitHub (and anything reading this repo,
 * e.g. the AIOS workspace) always sees what's really in Blob, not a stale seed.
 */
export async function GET(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, applications, cvVersions, voiceSamples] = await Promise.all([
    getProfile(),
    getApplications(),
    getVersions(),
    getVoiceSamples(),
  ]);

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    profile,
    applications,
    cv_versions: cvVersions,
    voice_samples: { samples: voiceSamples },
  });
}
