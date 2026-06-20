import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { JobAnalysis } from "@/lib/types";

function loadProfile() {
  const raw = readFileSync(join(process.cwd(), "data/profile.json"), "utf-8");
  return JSON.parse(raw);
}

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let jobAnalysis: JobAnalysis;
  try {
    const body = await request.json();
    jobAnalysis = body.job_analysis as JobAnalysis;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!jobAnalysis?.company) {
    return NextResponse.json({ error: "Missing job_analysis" }, { status: 400 });
  }

  const profile = loadProfile();

  const profileContext = [
    `ABOUT:\n${profile.about.long}`,
    `\nKEY EXPERIENCE (select 2-3 achievements that best match the role):`,
    ...(profile.experience as Array<{ company: string; role: string; period: string; bullets: string[] }>)
      .slice(0, 5)
      .map((exp) =>
        `${exp.company} | ${exp.role} | ${exp.period}:\n` +
        exp.bullets.slice(0, 3).map((b) => `  - ${b}`).join("\n")
      ),
  ].join("\n");

  const jobContext = [
    `Company: ${jobAnalysis.company}`,
    `Role: ${jobAnalysis.role_title}`,
    `Seniority: ${jobAnalysis.seniority}`,
    `Industry: ${jobAnalysis.industry}`,
    `Tone: ${jobAnalysis.company_tone}`,
    `Role focus: ${jobAnalysis.role_focus}`,
    `Required skills: ${jobAnalysis.required_skills.join(", ")}`,
    `Keywords: ${jobAnalysis.keywords.join(", ")}`,
  ].join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You are a cover letter writer for a senior executive. Write in first-person, direct, business-grade English.

FORMAT — industry cover letter, 3 paragraphs, 250–300 words total:
P1 HOOK: Reference the company's specific work, product, or market position, then state who you are and why you fit. One opening sentence about them, then you.
P2 EVIDENCE: 2-3 achievements from the profile translated into business value. Include quantified metrics where they exist. Mirror the JD vocabulary naturally.
P3 CLOSE: One sentence on what you'd bring in the first 90 days, then an active call to action ("I'd welcome a conversation" — not "Thank you for your consideration").

BANNED WORDS (never use): delve, tapestry, pivotal, synergy, paradigm, holistic, leverage, utilize, harness, spearhead, cornerstone, cutting-edge, groundbreaking, meticulous, seamlessly, showcase, bolster, foster, robust, nuanced

BANNED PHRASES: "proven track record" · "passionate about" · "I am writing to express my interest" · "I am excited to apply" · "demonstrated ability to" · "strong foundation in" · "well-versed in" · "I am uniquely positioned" · "In today's rapidly evolving"

STRUCTURAL RULES:
- Max 2 em-dashes in the entire letter
- Vary sentence length deliberately: mix 8–12 word sentences with 20–25 word sentences
- No two paragraphs may open with the same grammatical subject
- Bullets or sentences must NOT end with vague -ing phrases ("...contributing to improved outcomes" — bad)
- No defensive language about career pivots or background gaps

Output the letter body only — no date, no address, no "Dear [Name]", no signature block. Start directly with P1.`,
    messages: [
      {
        role: "user",
        content: `Write the cover letter.\n\nJOB:\n${jobContext}\n\nPROFILE:\n${profileContext}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }

  const text = textBlock.text.trim();
  const word_count = text.split(/\s+/).filter(Boolean).length;

  return NextResponse.json({ text, word_count });
}
