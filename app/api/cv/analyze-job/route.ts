import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const JOB_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    url: { type: "string" },
    company: { type: "string" },
    role_title: { type: "string" },
    industry: { type: "string" },
    seniority: { type: "string" },
    required_skills: { type: "array", items: { type: "string" } },
    nice_to_have: { type: "array", items: { type: "string" } },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "Words that should appear in the tailored CV",
    },
    company_tone: {
      type: "string",
      description: "e.g. formal, corporate, startup, mission-driven, technical",
    },
    role_focus: {
      type: "string",
      description: "One-sentence summary of what they actually want",
    },
  },
  required: [
    "url",
    "company",
    "role_title",
    "industry",
    "seniority",
    "required_skills",
    "nice_to_have",
    "keywords",
    "company_tone",
    "role_focus",
  ],
  additionalProperties: false,
};

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
    });

    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 25_000);

    if (text.length < 200) {
      return `[Page at ${url} returned minimal content — likely blocked. Analyze from URL context.]`;
    }
    return text;
  } catch {
    return `[Could not fetch ${url} — connection failed. Analyze from URL context only.]`;
  }
}

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const pageText = await fetchPageText(url);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.beta.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    system:
      "You are a job posting analyzer. Extract structured information from the job posting text. Set the url field to exactly the provided URL. For seniority use one of: junior, mid, senior, lead, director, executive. For company_tone describe the tone in 1-3 words. For role_focus write one concise sentence on what this role primarily does. If the page content is minimal, infer what you can from the URL and company name.",
    messages: [
      {
        role: "user",
        content: `Analyze this job posting.\n\nURL: ${url}\n\nPage content:\n${pageText}`,
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: JOB_ANALYSIS_SCHEMA,
      },
    },
    betas: ["structured-outputs-2025-12-15"],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No analysis returned" }, { status: 500 });
  }

  try {
    const analysis = JSON.parse(textBlock.text);
    analysis.url = url;
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: "Failed to parse analysis" }, { status: 500 });
  }
}
