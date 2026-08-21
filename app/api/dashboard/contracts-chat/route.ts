import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { calcCostUsd } from "@/lib/cv/cost";
import rawContracts from "../../../../data/contracts.json";
import rawMortgage from "../../../../data/mortgage.json";
import rawInsurance from "../../../../data/insurance.json";
import type { Contract, MortgageData, InsurancePolicy } from "@/lib/types";

const contracts = rawContracts.contracts as Contract[];
const mortgage = rawMortgage as MortgageData;
const policies = rawInsurance.policies as InsurancePolicy[];

const MAX_HISTORY = 12;

function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const ms = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function buildContext(): string {
  const contractsBlock = contracts
    .map((c) => {
      const days = daysUntil(c.permanencia_end);
      const permanenciaNote =
        c.permanencia_end == null
          ? "none — free to cancel anytime"
          : days !== null && days <= 0
            ? `${c.permanencia_end} — already passed, free to cancel`
            : `${c.permanencia_end} — ${days} days from today`;
      return (
        `- ${c.name} (${c.type}, ${c.provider}). Status: ${c.status}. Start: ${c.start_date ?? "unknown"}. ` +
        `Permanencia end: ${permanenciaNote}. Key terms: ${c.key_terms}`
      );
    })
    .join("\n");

  const fixedEndDays = daysUntil(mortgage.fixed_end_date);
  const mortgageBlock = `Mortgage detail (Hipoteca ${mortgage.lender}):
Principal: ${mortgage.principal}€ over ${mortgage.term_months} months, started ${mortgage.start_date}.
Fixed phase: ${mortgage.fixed_rate}% (bonified ${mortgage.fixed_rate_bonified}%) until ${mortgage.fixed_end_date} (${mortgage.fixed_period_months} months) — ${fixedEndDays !== null ? `${fixedEndDays} days from today` : "date unknown"}.
Variable phase after that: Euríbor 12M + ${mortgage.variable_spread}%, reviewed annually, max bonification -${mortgage.max_bonification}%.
Monthly payment: ${mortgage.monthly_payment}€ (bonified: ${mortgage.monthly_payment_bonified}€). TAE: ${mortgage.tae}% (bonified ${mortgage.tae_bonified}%).
Early repayment fee: max ${mortgage.early_repayment_fee_pct}% during first ${mortgage.early_repayment_fee_period_years} years.
Bonificadores: ${mortgage.bonificadores.map((b) => `${b.name} (-${b.bonification}%, requires: ${b.requirements})`).join("; ")}.
Obligations: linked account (${mortgage.obligaciones.cuenta_pago}), mandatory home insurance (${mortgage.obligaciones.seguro_hogar_anual}€/year), optional life insurance (${mortgage.obligaciones.seguro_vida_anual}€/year).`;

  const insuranceBlock = policies
    .map(
      (p) =>
        `- ${p.name} (${p.provider}). ${p.monthly_cost > 0 ? `${p.monthly_cost}€/month` : "included, no direct cost"}. ` +
        `Coverage: ${p.coverage.join(", ")}. Notes: ${p.notes}`
    )
    .join("\n");

  return `CONTRACTS ON FILE:\n${contractsBlock}\n\n${mortgageBlock}\n\nINSURANCE POLICIES:\n${insuranceBlock}`;
}

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value || authCookie.value !== process.env.DASHBOARD_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages?: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user" || !lastMessage.content?.trim()) {
    return NextResponse.json({ error: "Last message must be a non-empty user message" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured on this deployment" }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const trimmedHistory = messages.slice(-MAX_HISTORY).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const today = new Date().toISOString().slice(0, 10);

  let response;
  try {
    response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1536,
      system: `You are an expert contract advisor for a household finance dashboard. You are the single source of truth on everything about the contracts, mortgage, and insurance loaded below — permanencia, cancellation, auto-renewal, penalties, coverage, and obligations.

TODAY'S DATE: ${today}. Days-remaining figures in the data below are already computed against this date — use them directly, don't recompute from scratch, and never invent a number that isn't there.

RULES:
1. Answer ONLY using the data provided below — this is everything loaded into the system. If something isn't in the data, say so plainly and name what would be needed to answer (e.g. "check the original contract for the early-cancellation penalty clause") — never guess or invent an amount, date, or clause.
2. Always name the specific contract/policy an answer comes from, especially when comparing several.
3. Proactively flag anything time-sensitive even when not asked directly: a permanencia ending soon, the mortgage's fixed-rate period ending, a bonification requirement at risk of not being met. Don't wait for the user to ask about deadlines.
4. For a broad question ("what should I keep an eye on?", "what's coming up?"), summarize ordered by urgency — nearest deadline first.
5. Be concise and direct. Answer in the same language the question is asked in (Spanish, English, or Italian).

${buildContext()}`,
      messages: trimmedHistory,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Anthropic API error: ${msg}` }, { status: 500 });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return NextResponse.json({ error: "No response returned from model" }, { status: 500 });
  }

  const cost = calcCostUsd("claude-sonnet-4-6", response.usage.input_tokens, response.usage.output_tokens);
  return NextResponse.json({ reply: textBlock.text, _cost_usd: cost });
}
