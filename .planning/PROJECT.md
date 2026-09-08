# Smart Community President

## What This Is

A private intelligence layer for Nicola as president of his comunidad de propietarios,
built as a fourth authenticated surface inside the `Personal_brand` app. It sits on top of
the administrador de fincas — not replacing it — and answers one question at any moment:
*"What did I promise to follow up on, and what is pending my action or a neighbour's /
administrador's response?"* v1 is a single-user cockpit: Nicola feeds it (uploads,
forwarded emails) and acts on its output. No neighbour or administrador access.

## Core Value

At any moment the president can see every open commitment and incidencia, who it is
waiting on, and which LPH deadline is closing in — without digging through email.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Open-loop tracker (core)**
- [ ] Create/edit an `OpenLoop` with kind (commitment / incidencia / obra / follow_up / permiso), status (open / waiting_on_other / blocked / done / dropped), owner (me / neighbour / administrador / provider / junta), next action, and soft due date
- [ ] Attach one or more `Document`s (acta / contract / presupuesto / carta) to an OpenLoop
- [ ] Presupuestos sub-workflow: for an obra-kind loop, record multiple `Presupuesto`s (provider, amount, scope, received/valid dates, doc) and compare them side by side
- [ ] Passive cockpit view: OpenLoops grouped by due / overdue / waiting-on-others, sorted by urgency, shown when Nicola opens the surface

**LPH deadline engine**
- [ ] Record a `Junta` (date, type, convocatoria sent date, acta doc, acuerdos) and link acuerdos to OpenLoops
- [ ] Auto-compute per acuerdo: impugnación deadline (ejecutividad + 3 meses, or + 1 año if contrario a ley/estatutos), acta closure window (10 días naturales), and a `majority_type` flag with whether it was achieved
- [ ] Derived `accesibilidad_obligatoria` flag when annual budget ≤ 12 × mensualidad ordinaria
- [ ] Surface computed LPH deadlines in the passive cockpit alongside soft due dates

**LPH normativa Q&A**
- [ ] Chatbot that answers LPH questions ("what majority do I need for X?") grounded in LPH articles, following the existing Contracts Q&A assistant pattern (multilingual ES/EN/IT, history-trimmed)

**Lightweight pricing check**
- [ ] On a `Presupuesto`, request a Claude-with-web-search estimate of what that kind of work typically costs in Spain — advisory text only, no scraper, no stored dataset

**Ingestion**
- [ ] Manual PDF upload into the cockpit (private Blob storage + proxy route for viewing)
- [ ] Extend `scripts/email-organizer/` (iCloud IMAP → Drive) to also feed administrador emails to the cockpit as draft `Document`s / OpenLoops

**Platform**
- [ ] Standalone `app/community-president/` surface with its own `layout.tsx` (auth check mirroring `app/cv/layout.tsx`) and sidebar
- [ ] Shared `requireAuth()` helper with a strong `DASHBOARD_TOKEN` comparison, used by every new `/api/community/*` route
- [ ] `OpenLoop` / `Submission` separation preserved in the data model so a neighbour-facing intake form can bolt on later without a rewrite (`OpenLoop.source` already supports `neighbour_form`)

### Out of Scope

- **Neighbour-facing incidencia intake portal** — different product (owner identity, moderation, spam, notifications). Seed: `.planning/seeds/neighbour-incidencia-portal.md`. Trigger to revisit: one full junta cycle of real use.
- **Forking Smart Community President to its own repo** — same trigger as the portal; premature while it is Nicola's personal tool.
- **Replacing the administrador's ERP / system of record** — the administrador keeps official actas, contracts, accounts. This is a private layer on top.
- **AI extraction of acuerdos / OpenLoops from uploaded actas** — deferred to a post-v1 phase, designed as propose-then-confirm (never auto-commit). v1 is manual entry with documents attached. Research Q3 flags accuracy risk.
- **Full price-benchmarking scraper + structured pricing dataset (pillar 3)** — market-validated but administrador-facing; v2. Research Q2 open.
- **Structured `Building` dataset (pillar 4)** — units, cuotas, common elements, installations, warranties; v2.
- **Active / scheduled reminders and notifications** — weekly digest cron and per-loop reminders are v2. v1 deadline awareness is passive (shown on open).
- **Google Drive folder sync for ingestion** — the existing Drive integration is broken (`GOOGLE_REFRESH_TOKEN` dead) and administrador input arrives by email anyway; v1 uses upload + the email-organizer path.
- **Multi-writer support / per-owner identity / real database** — comes with the neighbour portal. v1 stays single-user, single-writer JSON.
- **Fixing the existing `/api/cv/*` weak-auth holes and adding root `middleware.ts`** — noted as a known issue; separate cleanup, not this milestone.

## Context

**Host application.** `Personal_brand` is a Next.js 16 App Router monolith on Vercel with
three existing surfaces (public portfolio, finance dashboard, CV builder) sharing one
`dashboard_auth` cookie and one storage abstraction. Smart Community President is a fourth
peer surface. Codebase map: `.planning/codebase/` (STACK, ARCHITECTURE, STRUCTURE,
INTEGRATIONS, CONVENTIONS, TESTING, CONCERNS — all dated 2026-09-08).

**Reused infrastructure (already proven in the CV builder / dashboard):**
- Blob-or-local JSON document store pattern — one module per document, `get*()` / `save*()`,
  branch on `BLOB_READ_WRITE_TOKEN`. Reference implementation: `lib/cv/profile-store.ts`
  (private access, `useCache: false`, `addRandomSuffix: false`, `allowOverwrite: true`).
- Serving a private Blob file to the browser via a proxy route
  (`app/api/cv/versions/[id]/pdf/route.ts`).
- Per-request Anthropic route pattern: cookie auth → parse body → `new Anthropic()` →
  prompt from typed shapes → `calcCostUsd()` from `lib/cv/cost.ts`.
- Contracts Q&A assistant (`app/api/dashboard/contracts-chat/route.ts`) — the model for
  the LPH Q&A chatbot: system prompt from stored JSON, history trimmed to last N turns,
  multilingual.
- iCloud IMAP → Google Drive email pipeline (`scripts/email-organizer/`) — already
  recognises and files administrador emails from Administraciones Colmenarejo
  (`attcliente@administracionescolmenarejo.es`). Local/manual runtime, not deployed.
- Vercel Cron pattern (`vercel.json` + `Bearer ${CRON_SECRET}` route) — available if a
  digest job is added in v2.
- `DESIGN.md` token system (Geist, neutral palette, section-label / tag-chip patterns).

**Add new code as** a fourth peer per `.planning/codebase/STRUCTURE.md` §"Where to Add New
Code": pages in `app/community-president/`, components in `app/components/community/`, API
routes `app/api/community/<action>/route.ts`, stores `lib/community/<thing>-store.ts`
(copy `versions-store.ts`), seed files `data/community-<thing>.json`, types in
`lib/types.ts` under a new section.

**Domain (LPH — Ley de Propiedad Horizontal).** Key rules the deadline engine encodes,
with sources, are in `.planning/notes/exploration-findings.md` and
`.planning/research/questions.md`: acta closure 10 días naturales (art. 19); convocatoria
ordinaria min. 6 días, ≥1 junta ordinaria/year (art. 16); majority types (art. 17) —
general doble mayoría simple, nuevos servicios / portería 3/5, accesibilidad + ascensor
mayoría simple del total, utility individual 1/3, estatutos unanimidad; accessibility works
obligatorias sin acuerdo if annual cost ≤ 12 mensualidades (art. 10); impugnación
caducidad 3 meses / 1 año, ausentes count from notification, does not suspend execution
(art. 18); presidente term 1 year.

**Data model sketch:** `.planning/notes/data-model-sketch.md` — `OpenLoop` (core, with
LPH-aware fields when tied to an acuerdo), plus `Document`, `Presupuesto`, `Junta`, and a
future `Building`. President-internal fields (LPH data, owner routing, presupuestos) stay
on `OpenLoop`, never on the future `Submission`.

**Market gap:** administrador ERPs (Gesfincas, Finca3, Fincaspro) are strong on
contabilidad, weak on commitment tracking; resident apps (Fincapp, Comunidad365) have no
legal-deadline logic; AI entrants (FincAI, Ciudadela) are administrador-facing. Nobody
sells a president's private cockpit that tracks open loops with LPH deadline awareness,
independent of the administrador.

**Open research questions** (`.planning/research/questions.md`): Q1 how Nicola reliably
gets actas out of the administrador (v1 answer: manual upload + extend email-organizer);
Q2 Spanish presupuesto pricing data sources (deferred with pillar 3); Q3 LLM extraction
accuracy on real actas (deferred with AI extraction).

## Constraints

- **Tech stack**: Next.js 16.2.4 App Router, React 19.2.4, TypeScript `strict`, Tailwind
  CSS v4 — this Next.js major is ahead of training data; read `node_modules/next/dist/docs/`
  before any routing/caching work (`AGENTS.md`).
- **Persistence**: Vercel Blob **private** store + committed `data/*.json` seed/dev fallback.
  No database in v1. Copy an already-fixed store (`lib/cv/profile-store.ts`) — never the
  `@vercel/blob` docs' default `access: "public"` examples. Serve private PDFs via a proxy
  route, never a blob URL.
- **Single-user, single-writer**: whole-file JSON rewrites, no locking. Acceptable for v1;
  the constraint breaks at the neighbour portal (→ Neon Postgres then).
- **Anthropic SDK**: repo uses `@anthropic-ai/sdk` via `client.beta.messages.create` with
  `betas: ["structured-outputs-2025-12-15"]` and non-standard model IDs
  (`claude-opus-4-8`, `claude-sonnet-4-6`) — verify model IDs against the Anthropic API
  before use and centralise the client + model IDs + beta flags in one
  `lib/community/anthropic.ts` (or a shared module).
- **LLM on untrusted documents**: acta PDFs and administrador emails are untrusted input to
  a model that can create/modify records — design every extraction path as
  propose-then-confirm, never auto-commit.
- **Auth**: new `/api/community/*` routes must do the strong
  `cookie.value === process.env.DASHBOARD_TOKEN` check via a shared helper. `DASHBOARD_TOKEN`
  must be set in every environment (the login route's random-UUID fallback fails open on
  weak-checked routes and closed on strong-checked ones).
- **Drive integration is currently broken** (`GOOGLE_REFRESH_TOKEN` returns `invalid_grant`).
  v1 ingestion does not depend on it; anything Drive-based needs the OAuth consent flow
  re-run first.
- **No test infrastructure exists** — no runner, no CI. Any testing this project wants must
  be set up from scratch.
- **Deployment**: `git push` to `main` → Vercel auto-build. No CI gate.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ship as a standalone `app/community-president/` surface, not under `/dashboard` | Cleanest separation; eases the later fork to its own repo; avoids inheriting the dashboard's half-done light-theme migration and zero mobile support | — Pending |
| v1 ingestion = manual upload + extend the Python email-organizer | Honest v1 with no OAuth/scraper dependency; the email-organizer already files Colmenarejo administrador emails | — Pending |
| AI extraction of actas deferred to a post-v1 phase | Learn the real `OpenLoop` shape from one junta cycle before designing extraction; propose-then-confirm design (Research Q3) | — Pending |
| Pricing check is lightweight (Claude + web search), not a scraper | Pillar 3 is market-validated but administrador-facing; a per-presupuesto advisory estimate delivers most of the value for near-zero infra | — Pending |
| Deadline awareness is passive (shown on open), not scheduled reminders | Smallest v1 that delivers the core value; cron digest and per-loop reminders are a clear v2 | — Pending |
| New routes get a shared `requireAuth()` strong-token helper; existing `/api/cv` holes left alone | Protects the new sensitive surface without expanding scope into an app-wide auth refactor | — Pending |
| Preserve `OpenLoop` / `Submission` separation now | The one piece of forward-compatibility that makes the neighbour portal cheap later instead of a rewrite | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-08 after initialization*
