import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { ContextEntry } from "@/lib/types";
import { getProfile, saveProfile } from "@/lib/cv/profile-store";

const POLISH_SCHEMA = {
  type: "object",
  properties: {
    statements: {
      type: "array",
      items: { type: "string" },
      description: "Polished factual statements derived from the candidate's raw answers",
    },
  },
  required: ["statements"],
  additionalProperties: false,
};

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { answers: Array<{ question: string; answer: string }>; job_context: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { answers, job_context } = body;
  const validAnswers = answers?.filter((a) => a.answer.trim().length > 10) ?? [];
  if (validAnswers.length === 0) {
    return NextResponse.json({ saved: false, reason: "No substantive answers to save" });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const answersText = validAnswers
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  let response;
  try {
    response = await client.beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are helping build a professional experience bank for a candidate's long-term career record. Transform their raw Q&A answers into polished, factual statements.

Rules:
- Write in first-person, past tense where applicable
- Be factual — preserve the actual metrics, names, and outcomes they mention
- Do NOT invent or embellish anything not stated
- Do NOT oversell — "managed a small team" stays "managed a small team", not "led a high-performing team"
- Use clean, professional language — no jargon, no buzzwords
- Each statement should stand alone as a concrete fact: what they did, in what context, with what result
- 1-2 sentences per answer maximum`,
      messages: [
        {
          role: "user",
          content: `Polish these interview answers into factual career statements.\n\nContext: candidate was applying for ${job_context}\n\n${answersText}`,
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: POLISH_SCHEMA },
      },
      betas: ["structured-outputs-2025-12-15"],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `API error: ${msg}` }, { status: 500 });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No response from model" }, { status: 500 });
  }

  let polished: { statements: string[] };
  try {
    polished = JSON.parse(textBlock.text);
  } catch {
    return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
  }

  // Append to profile.context_enrichment (Vercel Blob-backed — see lib/cv/profile-store.ts)
  try {
    const profile = await getProfile();
    const entry: ContextEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
      source_role: job_context,
      statements: polished.statements,
    };
    if (!Array.isArray(profile.context_enrichment)) {
      profile.context_enrichment = [];
    }
    profile.context_enrichment.push(entry);
    await saveProfile(profile);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to save to profile: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ saved: true, statements: polished.statements });
}
