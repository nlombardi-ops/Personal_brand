import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { JobAnalysis } from "@/lib/types";

const ANGLE_SCHEMA = {
  type: "object",
  properties: {
    fit: {
      type: "string",
      enum: ["strong", "moderate", "stretch"],
      description: "Honest overall fit: strong = clear match, moderate = some gaps but real shot, stretch = hard sell",
    },
    headline: {
      type: "string",
      description: "One punchy line summarising the strategic situation — e.g. 'Strong fintech fit, lead with AI sales not payments ops'",
    },
    what_works: {
      type: "array",
      items: { type: "string" },
      description: "2-3 specific things from the candidate's background that land for this role",
    },
    honest_gap: {
      type: "string",
      description: "The real gap or risk the hiring manager will clock. Be blunt. Empty string if no meaningful gap.",
    },
    angle: {
      type: "string",
      description: "The recommended framing — how to position yourself for maximum traction. 2-3 sentences.",
    },
    use_these: {
      type: "array",
      items: { type: "string" },
      description: "3-5 specific phrases or talking points to use in the cover letter and interview",
    },
    avoid: {
      type: "string",
      description: "What NOT to lead with — one sentence on the framing that would hurt the application",
    },
  },
  required: ["fit", "headline", "what_works", "honest_gap", "angle", "use_these", "avoid"],
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
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
  }
}
