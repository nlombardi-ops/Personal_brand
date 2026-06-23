import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { JobAnalysis, CvContent } from "@/lib/types";

const TAILORED_CV_SCHEMA = {
  type: "object",
  properties: {
    about: {
      type: "string",
      description: "2-3 sentences tailored to the role, mirroring company tone and keywords",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description: "12–15 skills selected and scored for relevance to this specific role. Do not include all skills — pick the most powerful and directly relevant ones, ordered by relevance descending.",
    },
    experience: {
      type: "array",
      items: {
        type: "object",
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          period: { type: "string" },
          bullets: {
            type: "array",
            items: { type: "string" },
            description: "2-4 selected and optionally rephrased bullet points",
          },
        },
        required: ["company", "role", "period", "bullets"],
        additionalProperties: false,
      },
    },
  },
  required: ["about", "skills", "experience"],
  additionalProperties: false,
};

function loadProfile() {
  const raw = readFileSync(join(process.cwd(), "data/profile.json"), "utf-8");
  return JSON.parse(raw);
}

function buildSkillsList(profile: Record<string, unknown>): string[] {
  const skills = profile.skills as Record<string, { skills: Array<{ name: string }> }>;
  return Object.values(skills).flatMap((cat) => cat.skills.map((s) => s.name));
}

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let jobAnalysis: JobAnalysis;
  let answers: Array<{ question: string; answer: string }> | undefined;
  try {
    const body = await request.json();
    jobAnalysis = body.job_analysis as JobAnalysis;
    answers = body.answers;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!jobAnalysis?.company) {
    return NextResponse.json({ error: "Missing job_analysis" }, { status: 400 });
  }

  const profile = loadProfile();
  const allSkills = buildSkillsList(profile);

  const profileSummary = {
    about: profile.about,
    skills: allSkills,
    experience: (profile.experience as Array<{
      company: string;
      role: string;
      period: string;
      start: string;
      end: string | null;
      bullets: string[];
    }>).map((exp) => ({
      company: exp.company,
      role: exp.role,
      period: exp.period,
      bullets: exp.bullets,
    })),
  };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Format profile as readable text — cheaper to tokenize than JSON dump
  const profileText = [
    `ABOUT (long version):\n${profileSummary.about.long}`,
    `\nEXPERIENCE:`,
    ...profileSummary.experience.map((exp, i) =>
      `${i + 1}. ${exp.company.toUpperCase()} | ${exp.role} | ${exp.period}\n` +
      exp.bullets.map((b) => `   - ${b}`).join("\n")
    ),
    `\nSKILLS (${profileSummary.skills.length} total — return all, reordered):\n${profileSummary.skills.join(", ")}`,
  ].join("\n");

  // Format job as key-value pairs — no JSON overhead
  const jobText = [
    `Company: ${jobAnalysis.company}`,
    `Role: ${jobAnalysis.role_title}`,
    `Seniority: ${jobAnalysis.seniority}`,
    `Industry: ${jobAnalysis.industry}`,
    `Tone: ${jobAnalysis.company_tone}`,
    `Role focus: ${jobAnalysis.role_focus}`,
    `Required skills: ${jobAnalysis.required_skills.join(", ")}`,
    `Nice to have: ${jobAnalysis.nice_to_have.join(", ")}`,
    `CV keywords: ${jobAnalysis.keywords.join(", ")}`,
  ].join("\n");

  const response = await client.beta.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `You are a CV tailoring specialist. Output valid JSON only — no commentary.

ONE-PAGE CONSTRAINT — mandatory:
The CV must fit exactly one A4 page. Enforce strictly:
- about: maximum 2 sentences
- bullets: maximum 2–3 per role (pick the strongest)
- skills: select and return 12–15 most relevant skills only — NOT all skills

WRITING RULES — mandatory on every bullet and sentence:

BANNED WORDS (never use): delve, tapestry, pivotal, synergy, paradigm, holistic, leverage, utilize, harness, spearhead, cornerstone, cutting-edge, groundbreaking, meticulous, seamlessly, showcase, bolster, foster, embark, nuanced

BANNED VERBS → replacements: leverage→use/apply · utilize→use · harness→apply/draw on · spearhead→lead/launch · facilitate→run/lead · showcase→show/demonstrate · bolster→strengthen · foster→build/support

BANNED ADVERBS: meticulously, notably, subsequently, remarkably, seamlessly, thereby

STRUCTURAL — #1 AI tell — bullets must NOT end with vague -ing phrases:
  BAD: "...contributing to improved delivery efficiency"
  BAD: "...enabling new growth opportunities"
  GOOD: "...cut delivery failures by 23%" (ends with metric)
  GOOD: "...closed 3 new fleet contracts in year one" (ends with concrete fact)

WRITE LIKE THIS:
  · Specific over generic: "ran 5 UNDP discovery workshops" not "conducted extensive stakeholder engagement"
  · Use tool names, company names, contract values — not vague synonyms
  · Short connectors: "so", "but", "then" — not "consequently", "however", "additionally"

CONTENT RULES:

1. about (2-3 sentences, first-person):
   - Lead with your strongest match to the role's focus
   - Naturally use at least 2 of the CV keywords
   - Match the company tone exactly
   - No filler ("I am passionate about", "I believe in", "I am excited")

2. skills:
   - Select 12–15 skills that are most powerful and directly relevant to this role
   - Score and pick — do NOT return all ${profileSummary.skills.length} skills
   - Order by relevance to the role descending

3. experience — include ALL ${profileSummary.experience.length} roles:
   - Pick 2–4 bullets per role
   - Priority order: (1) bullets with quantified results, (2) bullets overlapping required skills, (3) bullets matching seniority level
   - You may rephrase a bullet to include 1–2 CV keywords — never invent metrics or outcomes
   - Never upgrade verb strength beyond what the source bullet supports

PROFILE:
${profileText}`,
    messages: [
      {
        role: "user",
        content: [
        `Tailor the CV for this role:\n\n${jobText}`,
        answers && answers.filter((a) => a.answer.trim().length > 10).length > 0
          ? `\n\nCANDIDATE CONTEXT (first-hand answers — treat as evidence, weave into bullets and about where relevant):\n${
              answers
                .filter((a) => a.answer.trim().length > 10)
                .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
                .join("\n\n")
            }`
          : "",
      ]
        .filter(Boolean)
        .join(""),
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: TAILORED_CV_SCHEMA,
      },
    },
    betas: ["structured-outputs-2025-12-15"],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }

  let tailored: { about: string; skills: string[]; experience: Array<{ company: string; role: string; period: string; bullets: string[] }> };
  try {
    tailored = JSON.parse(textBlock.text);
  } catch {
    return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
  }

  const cvContent: CvContent = {
    about: tailored.about,
    skills: tailored.skills,
    experience: tailored.experience,
    education: profile.education,
    languages: profile.languages,
    referrals: (profile.referrals as Array<{ name: string; title: string; company: string; status: string }>)
      .filter((r) => r.status === "confirmed"),
    meta: {
      target_company: jobAnalysis.company,
      target_role: jobAnalysis.role_title,
    },
  };

  return NextResponse.json(cvContent);
}
