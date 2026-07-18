import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { calcCostUsd } from "@/lib/cv/cost";

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

  let body: { url?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url, text } = body;
  if (!url && !text) {
    return NextResponse.json({ error: "Missing url or text" }, { status: 400 });
  }

  let pageText: string;
  if (text && text.trim().length > 50) {
    pageText = text.trim().slice(0, 25_000);
  } else if (url) {
    pageText = await fetchPageText(url);
  } else {
    return NextResponse.json({ error: "Provide a url or paste text" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured on this deployment" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let response;
  try {
    response = await client.beta.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system:
        "You are a job posting analyzer. Extract structured information from the job posting text. Set the url field to the provided URL, or empty string if none. For seniority use one of: junior, mid, senior, lead, director, executive. For company_tone describe the tone in 1-3 words. For role_focus write one concise sentence on what this role primarily does.",
      messages: [
        {
          role: "user",
          content: `Analyze this job posting.\n\n${url ? `URL: ${url}\n\n` : ""}Page content:\n${pageText}`,
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Anthropic API error: ${msg}` }, { status: 500 });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No analysis returned from model" }, { status: 500 });
  }

  try {
    const analysis = JSON.parse(textBlock.text);
    analysis.url = url ?? "";
    analysis._cost_usd = calcCostUsd("claude-opus-4-8", response.usage.input_tokens, response.usage.output_tokens);
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: `Failed to parse model response: ${textBlock.text.slice(0, 200)}` }, { status: 500 });
  }
}
