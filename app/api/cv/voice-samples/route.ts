import { NextRequest, NextResponse } from "next/server";
import type { VoiceSample } from "@/lib/types";
import { getVoiceSamples, saveVoiceSamples } from "@/lib/cv/voice-store";

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { entries: Array<{ text: string; context?: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validEntries = (body.entries ?? []).filter((e) => e.text?.trim().length > 10);
  if (validEntries.length === 0) {
    return NextResponse.json({ saved: false, reason: "No substantive entries to save" });
  }

  const date = new Date().toISOString().slice(0, 10);
  const newSamples: VoiceSample[] = validEntries.map((e) => ({
    id: crypto.randomUUID(),
    date,
    source: "cover_letter_answer",
    context: e.context,
    text: e.text.trim(),
  }));

  try {
    const samples = await getVoiceSamples();
    samples.push(...newSamples);
    await saveVoiceSamples(samples);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save voice samples: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ saved: true, count: newSamples.length });
}
