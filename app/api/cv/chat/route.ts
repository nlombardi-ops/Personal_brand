import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { JobAnalysis, Profile, ContextEntry } from "@/lib/types";
import { getProfile } from "@/lib/cv/profile-store";
import { getVoiceSamples } from "@/lib/cv/voice-store";
import { getVoiceProfileGuide } from "@/lib/cv/voice-profile";
import { calcCostUsd } from "@/lib/cv/cost";

const MODEL = "claude-sonnet-4-6";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let jobAnalysis: JobAnalysis;
  let messages: ChatMessage[];
  let angleSummary: string;
  let coverLetter: string;
  try {
    const body = await request.json();
    jobAnalysis = body.job_analysis as JobAnalysis;
    messages = (body.messages ?? []) as ChatMessage[];
    angleSummary = body.angle_summary ?? "";
    coverLetter = body.cover_letter ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!jobAnalysis?.company) {
    return NextResponse.json({ error: "Missing job_analysis" }, { status: 400 });
  }
  if (messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  const profile = (await getProfile()) as Profile;
  const voiceSamples = await getVoiceSamples();

  const profileContext = [
    `ABOUT:\n${profile.about.long}`,
    `\nFULL EXPERIENCE:`,
    ...(profile.experience as Array<{ company: string; role: string; period: string; bullets: string[] }>).map(
      (exp) =>
        `${exp.company} | ${exp.role} | ${exp.period}:\n` +
        exp.bullets.map((b) => `  - ${b}`).join("\n")
    ),
    `\nEDUCATION:\n${profile.education
      .map((e) => `  - ${e.degree}, ${e.institution} (${e.year})`)
      .join("\n")}`,
    `\nLANGUAGES:\n${profile.languages.map((l) => `  - ${l.language}: ${l.level}`).join("\n")}`,
  ].join("\n");

  // The experience bank — situational answers accumulated from past applications
  const enrichment = (profile.context_enrichment ?? []) as ContextEntry[];
  const enrichmentBlock =
    enrichment.length > 0
      ? `\n\nEXPERIENCE BANK (the candidate's own answers from past applications — first-hand, verified, reuse freely):\n${enrichment
          .slice(-12)
          .map((e) => `[${e.source_role}]\n${e.statements.map((s) => `  - ${s}`).join("\n")}`)
          .join("\n")}`
      : "";

  const jobContext = [
    `Company: ${jobAnalysis.company}`,
    `Role: ${jobAnalysis.role_title}`,
    `Seniority: ${jobAnalysis.seniority}`,
    `Industry: ${jobAnalysis.industry}`,
    `Tone: ${jobAnalysis.company_tone}`,
    `Role focus: ${jobAnalysis.role_focus}`,
    `Required skills: ${jobAnalysis.required_skills.join(", ")}`,
    `Nice to have: ${jobAnalysis.nice_to_have.join(", ")}`,
    `Keywords: ${jobAnalysis.keywords.join(", ")}`,
  ].join("\n");

  const angleBlock = angleSummary ? `\n\nHR READ OF THIS ROLE:\n${angleSummary}` : "";
  const clBlock = coverLetter
    ? `\n\nCOVER LETTER ALREADY GENERATED FOR THIS APPLICATION (stay consistent with it, never contradict it, and do not repeat it word for word):\n${coverLetter}`
    : "";

  const voiceGuide = getVoiceProfileGuide();
  const voiceGuideBlock = voiceGuide ? `\n\nCANDIDATE'S VOICE GUIDE — follow it:\n${voiceGuide}` : "";

  const recentVoiceSamples = voiceSamples.slice(-6);
  const voiceReference =
    recentVoiceSamples.length > 0
      ? `\n\nREAL EXCERPTS OF HOW THE CANDIDATE WRITES (mirror the rhythm and directness; never quote verbatim):\n${recentVoiceSamples
          .map((s) => `"${s.text}"`)
          .join("\n")}`
      : "";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: `You help the candidate answer the free-text questions that application forms ask — "What makes you the right hire for this position?", "Why this company?", "Describe a time you…", plus any short message they need to send about this application.

You are drafting text the candidate will paste into a form. So:
- Output the answer itself, ready to paste. No preamble, no "Here's a draft:", no closing commentary.
- Default to SHORT: 120–180 words unless the form states a longer limit or the candidate asks for more. Crisp beats comprehensive.
- Write in the candidate's first person.
- Lead with the single strongest, most specific claim. Concrete beats complete.
- Use only facts present in the profile, the experience bank, or what the candidate tells you in this conversation. Never invent an employer, a metric, a title, or a date.
- If the role asks for something the candidate genuinely lacks, do not fake it. Either leave it out, or name it plainly in one forward-leaning line — the candidate would rather be defensible in the interview than impressive on the form.
- Numbers and named clients are the point. Prefer "moved correct-delivery geography from 85% to 95%" over "drove significant operational improvement".

BANNED WORDS: delve, tapestry, pivotal, synergy, paradigm, holistic, leverage, utilize, harness, spearhead, cornerstone, cutting-edge, groundbreaking, meticulous, seamlessly, showcase, bolster, foster, robust, nuanced
BANNED PHRASES: "proven track record" · "passionate about" · "I am writing to express" · "I am excited to apply" · "demonstrated ability to" · "uniquely positioned" · "In today's rapidly evolving"

When the candidate asks you to revise ("shorter", "less detail", "more technical"), return the full revised answer, not a diff.

If the candidate asks you a question about the role or their fit rather than asking for a draft, answer it directly and briefly — you are not required to always produce form text.

JOB BEING APPLIED TO:
${jobContext}${angleBlock}

CANDIDATE PROFILE:
${profileContext}${enrichmentBlock}${clBlock}${voiceGuideBlock}${voiceReference}`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }

  const cost = calcCostUsd(MODEL, response.usage.input_tokens, response.usage.output_tokens);

  return NextResponse.json({ text: textBlock.text.trim(), _cost_usd: cost });
}
