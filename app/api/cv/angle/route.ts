import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { JobAnalysis } from "@/lib/types";
import { calcCostUsd } from "@/lib/cv/cost";

const ANGLE_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "4-6 sentences written as a senior headhunter speaking directly to the candidate. Cover: honest fit assessment, what specifically lands from their background, the real gap (if any), and the exact angle they should lead with. No headers, no bullets, no platitudes — just straight talk.",
    },
  },
  required: ["summary"],
  additionalProperties: false,
};

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

  const profileSnippet = [
    `About: ${profile.about?.short ?? profile.about?.long?.slice(0, 300)}`,
    `Recent roles: ${(profile.experience as Array<{ company: string; role: string; period: string }>)
      .slice(0, 3)
      .map((e) => `${e.role} at ${e.company} (${e.period})`)
      .join(" | ")}`,
    `Key skills: ${Object.values(profile.skills as Record<string, { skills: Array<{ name: string }> }>)
      .flatMap((cat) => cat.skills.map((s) => s.name))
      .slice(0, 20)
      .join(", ")}`,
    `Education: ${(profile.education as Array<{ degree: string; institution: string }>)
      .map((e) => `${e.degree} — ${e.institution}`)
      .join("; ")}`,
  ].join("\n");

  const jobSnippet = [
    `Company: ${jobAnalysis.company}`,
    `Role: ${jobAnalysis.role_title}`,
    `Seniority: ${jobAnalysis.seniority}`,
    `Industry: ${jobAnalysis.industry}`,
    `Tone: ${jobAnalysis.company_tone}`,
    `What they actually want: ${jobAnalysis.role_focus}`,
    `Required: ${jobAnalysis.required_skills.join(", ")}`,
    `Nice to have: ${jobAnalysis.nice_to_have.join(", ")}`,
  ].join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.beta.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system: `You are a senior headhunter with 15 years placing candidates into tech and fintech companies. You give honest, strategic advice — no corporate platitudes, no false encouragement. You tell candidates exactly what angle will land and what will sink them. You have read thousands of CVs and interviewed hundreds of hiring managers. Be specific, be direct, be useful.`,
    messages: [
      {
        role: "user",
        content: `Analyse this candidate's fit for this role and give strategic advice.\n\nCANDIDATE:\n${profileSnippet}\n\nROLE:\n${jobSnippet}`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: ANGLE_SCHEMA,
      },
    },
    betas: ["structured-outputs-2025-12-15"],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }

  try {
    const analysis = JSON.parse(textBlock.text);
    const cost = calcCostUsd("claude-opus-4-8", response.usage.input_tokens, response.usage.output_tokens);
    return NextResponse.json({ ...analysis, _cost_usd: cost });
  } catch {
    return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
  }
}
