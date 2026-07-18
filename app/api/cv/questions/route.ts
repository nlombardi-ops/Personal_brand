import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { JobAnalysis } from "@/lib/types";
import { calcCostUsd } from "@/lib/cv/cost";
import { getProfile } from "@/lib/cv/profile-store";

const QUESTIONS_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: { type: "string" },
      description: "3-5 pointed, concrete questions to surface specific achievements the candidate may have forgotten or underplayed",
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

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

  const profile = await getProfile();

  const recentRoles = (profile.experience as Array<{ company: string; role: string; period: string; bullets: string[] }>)
    .slice(0, 3)
    .map((e) => `${e.role} at ${e.company} (${e.period}): ${e.bullets.slice(0, 2).join(" | ")}`)
    .join("\n");

  const alreadyCovered = (profile.context_enrichment ?? []).flatMap((e) => e.statements);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let response;
  try {
    response = await client.beta.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are a senior interviewer preparing a candidate for a specific role. Generate 3-5 questions that will surface concrete, specific achievements or experiences the candidate may have forgotten or underplayed on their CV.

Rules:
- Questions must be concrete and role-specific, not generic ("Tell me about a challenge")
- Each question targets a gap between the candidate's background and the role requirements
- Frame questions as an interviewer would: "Walk me through..." / "Give me a specific example of..." / "What was the outcome when you..."
- Aim to uncover: deal sizes, outcomes, team sizes, tools used, client names, project results
- Max 5 questions
- Do not ask about anything already covered in ALREADY-KNOWN FACTS below — target genuinely new gaps`,
      messages: [
        {
          role: "user",
          content: [
            `Generate interview questions for this candidate applying to this role.\n\nCANDIDATE RECENT ROLES:\n${recentRoles}\n\nROLE THEY'RE APPLYING TO:\nCompany: ${jobAnalysis.company}\nRole: ${jobAnalysis.role_title}\nRequired: ${jobAnalysis.required_skills.join(", ")}\nRole focus: ${jobAnalysis.role_focus}`,
            alreadyCovered.length > 0
              ? `\n\nALREADY-KNOWN FACTS (from past interview prep — do not re-ask these):\n${alreadyCovered.map((s) => `- ${s}`).join("\n")}`
              : "",
          ].filter(Boolean).join(""),
        },
      ],
      output_config: {
        format: { type: "json_schema", schema: QUESTIONS_SCHEMA },
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

  try {
    const result = JSON.parse(textBlock.text);
    const cost = calcCostUsd("claude-sonnet-4-6", response.usage.input_tokens, response.usage.output_tokens);
    return NextResponse.json({ ...result, _cost_usd: cost });
  } catch {
    return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
  }
}
