import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { calcCostUsd } from "@/lib/cv/cost";
import rawContracts from "../../../../data/contracts.json";
import rawMortgage from "../../../../data/mortgage.json";
import rawInsurance from "../../../../data/insurance.json";
import rawRates from "../../../../data/rates.json";
import { getBillsData } from "@/lib/drive/sync";
import type { Contract, MortgageData, InsurancePolicy, RatesData, BillsData } from "@/lib/types";

const contracts = rawContracts.contracts as Contract[];
const mortgage = rawMortgage as MortgageData;
const policies = rawInsurance.policies as InsurancePolicy[];
const rates = rawRates as RatesData;

const MAX_HISTORY = 12;

// Default posture: nothing that is not in the files.
const FACTS_BLOCK = `
6. Do not speculate about the wider market. If asked whether something is a good
   deal, answer only from what is on file, and say plainly that no market
   comparison data has been loaded.`;

// Advisor posture: market judgement is allowed, but it is never allowed to look
// like his own data. Every market claim carries a label and a way to check it.
const ADVISOR_BLOCK = `
6. DEAL REVIEW MODE IS ON. You may now use your general knowledge of the Spanish
   consumer market (telecoms, energy, home and life insurance, mortgages) to
   judge whether he is overpaying and where a better deal is likely to exist.

7. Separate fact from judgement, always, in this exact form:
   - Prefix anything taken from the files with [ON FILE].
   - Prefix any market claim of yours with [MERCADO - verificar].
   Never put an [ON FILE] figure and a [MERCADO - verificar] figure in the same
   sentence without both labels. The user must be able to see at a glance which
   numbers are his and which are your estimate.

8. Every [MERCADO - verificar] claim must carry:
   - a range, not a false-precision single number ("around 15-20EUR/month");
   - who to check it with (a named provider or comparator);
   - the caveat that your market knowledge has a cutoff and prices move.

9. Quantify the prize in annual terms using HIS real numbers: "you pay X/month
   [ON FILE], typical is Y-Z [MERCADO], so roughly (X-Y)*12/year at stake."
   A saving that does not clear about 100EUR/year is usually not worth the churn
   — say so rather than padding the list.

10. Respect the blockers already in the data. Never recommend cancelling
    something inside its permanencia without naming the penalty, and never
    recommend dropping a product that carries a mortgage bonificacion without
    netting the lost bonificacion against the saving.

11. Lead with the single biggest opportunity. Rank by euros per year, not by how
    easy it is.`;

function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const ms = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// What he actually pays month to month. Without this the assistant can reason
// about clauses but not about money, which is half of "am I overpaying".
function buildBillsContext(bills: BillsData): string {
  const sections = (["energy", "internet", "community"] as const).map((key) => {
    const rows = (bills[key] ?? []) as Array<{ month: string; total?: number; cuota?: number; provider?: string }>;
    if (rows.length === 0) return `- ${key}: no invoices on file`;

    const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
    const amount = (r: (typeof sorted)[number]) => r.total ?? r.cuota ?? 0;
    const recent = sorted.slice(-12);
    const avg = recent.reduce((sum, r) => sum + amount(r), 0) / recent.length;
    const latest = sorted[sorted.length - 1];

    return (
      `- ${key} (${latest.provider ?? "unknown provider"}): latest ${amount(latest).toFixed(2)}EUR ` +
      `(${latest.month}), ${recent.length}-month average ${avg.toFixed(2)}EUR, ` +
      `annualised ~${(avg * 12).toFixed(0)}EUR/year. ` +
      `Series: ${recent.map((r) => `${r.month} ${amount(r).toFixed(2)}`).join(" · ")}`
    );
  });

  return `WHAT HE ACTUALLY PAYS (from the invoices synced off Drive):\n${sections.join("\n")}`;
}

function buildRatesContext(): string {
  const e = rates.euribor_12m as RatesData["euribor_12m"] & { as_of?: string; source?: string };
  const current =
    e.current != null
      ? `12-month Euribor: ${e.current}% (${e.as_of ?? "period unknown"}, ${e.source ?? "source unrecorded"}).`
      : "12-month Euribor: not on file — run `node scripts/fetch-rates.mjs`.";

  const history = e.history ?? [];
  const yearAgo = history.length >= 13 ? history[history.length - 13] : null;
  const trend =
    yearAgo && e.current != null
      ? ` Twelve months ago it was ${yearAgo.rate}% (${yearAgo.date}), so it has moved ${(e.current - yearAgo.rate >= 0 ? "+" : "")}${(e.current - yearAgo.rate).toFixed(3)} points.`
      : "";

  const offers = [
    rates.mortgage_offers.length > 0
      ? `Mortgage offers recorded by hand: ${rates.mortgage_offers
          .map((o) => `${o.bank} ${o.type} ${o.rate}% (${o.bonificaciones})`)
          .join("; ")}`
      : "Mortgage offers on file: none — nothing has been recorded to compare against.",
    rates.insurance_offers.length > 0
      ? `Insurance offers recorded by hand: ${rates.insurance_offers.length} on file.`
      : "Insurance offers on file: none.",
  ].join("\n");

  return `MARKET REFERENCE DATA:\n${current}${trend}\n${offers}`;
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

  return `CONTRACTS ON FILE:\n${contractsBlock}\n\n${mortgageBlock}\n\nINSURANCE POLICIES:\n${insuranceBlock}\n\n${buildRatesContext()}`;
}

export async function POST(request: NextRequest) {
  const authCookie = request.cookies.get("dashboard_auth");
  if (!authCookie?.value || authCookie.value !== process.env.DASHBOARD_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    messages?: { role: "user" | "assistant"; content: string }[];
    mode?: "facts" | "advisor";
  };
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

  // Bills live in Blob (synced off Drive), unlike the hand-maintained contract
  // files, so they are read per request rather than imported at build time.
  let billsBlock: string;
  try {
    billsBlock = buildBillsContext(await getBillsData());
  } catch {
    billsBlock = "WHAT HE ACTUALLY PAYS: invoice data unavailable this request.";
  }

  const advisorMode = body.mode === "advisor";

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
${advisorMode ? ADVISOR_BLOCK : FACTS_BLOCK}

${buildContext()}

${billsBlock}`,
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
