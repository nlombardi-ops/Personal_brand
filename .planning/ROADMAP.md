# Roadmap: Smart Community President

## Overview

Smart Community President ships as a fourth authenticated surface inside the existing,
deployed `Personal_brand` app. The roadmap stands up that surface with the open-loop
tracker and its urgency cockpit (Phase 1), backs every loop with real paperwork and a
side-by-side presupuestos comparison (Phase 2), then adds the LPH deadline engine that
gives those loops legal teeth (Phase 3). Phase 4 layers Claude-assisted advice — an LPH
Q&A chatbot and a per-presupuesto pricing sanity check — behind one centralised Anthropic
client. Phase 5 closes the ingestion loop by extending the local email-organizer pipeline
to drop administrador emails into the cockpit as propose-then-confirm drafts. Every phase
is an end-to-end vertical slice — standalone surface + `/api/community/*` route(s) +
private Blob-JSON store + UI — deployed to the existing Vercel project. No walking
skeleton: the Next.js app, Vercel deploy, Blob store, auth cookie, Anthropic route
pattern and PDF proxy pattern all already exist.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Cockpit Foundation & Open-Loop Tracker** - Standalone authenticated Community President surface where every open commitment/incidencia is captured and ranked by urgency on open (completed 2026-09-10)
- [ ] **Phase 2: Documents & Presupuestos Workflow** - Upload PDFs to private Blob, attach documents to loops, and compare competing presupuestos side by side
- [ ] **Phase 3: LPH Deadline Engine** - Juntas and acuerdos carry auto-computed impugnación / acta-closure / majority / mandatory-accessibility clocks that surface in the cockpit
- [ ] **Phase 4: Claude-Assisted Advice (LPH Q&A + Presupuesto Pricing)** - LPH-grounded chatbot and a per-presupuesto web-search pricing check behind one centralised Anthropic client
- [ ] **Phase 5: Administrador Email Ingestion** - Extended email-organizer pipeline turns Administraciones Colmenarejo emails into propose-then-confirm draft Documents / OpenLoops

## Phase Details

### Phase 1: Cockpit Foundation & Open-Loop Tracker

**Goal**: Nicola has a private, authenticated Community President cockpit where he can capture every open commitment and incidencia and see them ranked by urgency the moment he opens it.
**Mode:** mvp
**Depends on**: Nothing (first slice; builds on the existing app's routing, deploy, auth cookie and Blob store)
**Requirements**: PLAT-01, PLAT-02, PLAT-03, LOOP-01, LOOP-04
**Success Criteria** (what must be TRUE):

  1. Visiting `/community-president` without a valid `dashboard_auth` cookie redirects Nicola to the login page; with it, the cockpit and its own sidebar load.
  2. Nicola can create an OpenLoop (kind, status, owner, next action, soft due date) and later edit any of those fields, and the change survives a page reload (persisted to a private Blob-JSON store).
  3. On opening the cockpit Nicola sees his OpenLoops split into overdue / due-soon / waiting-on-others groups, ordered by urgency, with no manual filtering.
  4. Any request to a `/api/community/*` route with a missing or wrong token is rejected with 401 via a shared `requireAuth()` helper doing a strong `=== DASHBOARD_TOKEN` comparison.
  5. Every stored OpenLoop carries a `source` field that already accepts a `neighbour_form` value, and no president-internal field (LPH data, owner routing, presupuestos) is defined on a shared/neighbour-visible shape.

**Plans:** 3/3 plans complete

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Slice 1 (wave 1): authenticated `/community-president` surface + sidebar, `OpenLoop`/`Submission` types, dual-mode store, `requireAuth()`, and creating the first loop in the slide-over so it survives a reload

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Slice 2 (wave 2): the passive urgency board — tested `groupLoopsByUrgency` (D-01…D-07), three columns + collapsed "Sin fecha", relative-date cards, and the D-17 count strip

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Slice 3 (wave 3): allow-listed PATCH endpoint, slide-over edit + "Descartar", inline quick actions (D-12), mobile stacking (D-15), and the PLAT-03 / SC-5 audit

**UI hint**: yes

### Phase 2: Documents & Presupuestos Workflow

**Goal**: Nicola can back every loop with its real paperwork — upload a PDF, reopen it in the browser, and for building works line up competing presupuestos side by side.
**Mode:** mvp
**Depends on**: Phase 1 (cockpit surface, auth helper, OpenLoop store)
**Requirements**: INGEST-01, LOOP-02, LOOP-03
**Success Criteria** (what must be TRUE):

  1. Nicola can upload a PDF into the cockpit; it lands in the private Vercel Blob store and he can reopen it later through a proxy route (never a raw blob URL).
  2. Nicola can attach one or more Documents (acta / contract / presupuesto / carta) to an OpenLoop and open any of them from that loop.
  3. On an obra-kind loop Nicola can record multiple Presupuestos — provider, amount, scope, received/valid dates, linked document.
  4. Nicola can view those Presupuestos in a side-by-side comparison showing provider, amount, scope and dates together.

**Plans:** 3 plans

Plans:
**Wave 1**

- [ ] 02-01-PLAN.md — Slice 1 (INGEST-01): client-upload to the private Blob store via a `handleUpload` token broker, the `Document` type + dual-mode store + file-type allow-list, the authenticated inline file proxy, and the `Documentos` surface with classify / retitle / date / archive

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 02-02-PLAN.md — Slice 2 (LOOP-02): the many-to-many `linked_loop_ids` link working in both directions, the widened `LoopDetailPanel` that resolves and opens a loop's attachments, upload-from-a-loop auto-attach, and the board's attachment-count chip

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 02-03-PLAN.md — Slice 3 (LOOP-03): the `Presupuesto` entity with integer-cents money and a server-computed total on obra loops, the tested pure `comparePresupuestos`, and the attributes × quotes comparison table with cheapest highlighting, deltas and a sort control

**UI hint**: yes

### Phase 3: LPH Deadline Engine

**Goal**: Every acuerdo Nicola logs from a junta automatically carries its legal clock — impugnación window, acta-closure deadline, majority check, mandatory-accessibility flag — and those dates compete for attention in the cockpit.
**Mode:** mvp
**Depends on**: Phase 1 (cockpit + OpenLoop store); Phase 2 (Document store, for linking the acta)
**Requirements**: LPH-01, LPH-02, LPH-03, LPH-04, LPH-05
**Success Criteria** (what must be TRUE):

  1. Nicola can record a Junta (date, ordinaria/extraordinaria, convocatoria sent date, acta document, acuerdos) and link an acuerdo to an OpenLoop.
  2. For each acuerdo the system shows an impugnación deadline computed as ejecutividad date + 3 meses, or + 1 año when Nicola flags it contrario a ley/estatutos.
  3. For each junta the system shows the acta closure window (10 días naturales from the junta date) and records the acuerdo's `majority_type` with whether it was achieved.
  4. When an annual works budget is ≤ 12 × mensualidad ordinaria, the acuerdo shows an `accesibilidad_obligatoria` flag.
  5. Computed LPH deadlines appear in the passive cockpit next to soft due dates and are factored into the urgency ordering.

**Plans**: TBD

### Phase 4: Claude-Assisted Advice (LPH Q&A + Presupuesto Pricing)

**Goal**: Nicola can ask "what majority do I need for X?" and get an LPH-grounded answer, and on any presupuesto get a Claude web-search read on whether the price is normal for Spain — all through one centralised, model-ID-verified Anthropic client.
**Mode:** mvp
**Depends on**: Phase 1 (surface + auth); Phase 2 (Presupuesto entity, for PRICE-01)
**Requirements**: QA-01, PRICE-01
**Success Criteria** (what must be TRUE):

  1. Nicola can ask an LPH question in a chatbot and get an answer grounded in LPH articles, in ES / EN / IT, with earlier turns trimmed to a recent window (Contracts Q&A assistant pattern).
  2. On a Presupuesto Nicola can request a pricing estimate and see advisory text from Claude-with-web-search about typical Spanish costs for that kind of work — nothing is stored or scraped.
  3. All Community-President LLM calls go through a single `lib/community/anthropic.ts` (client + model IDs + beta flags), and every model ID used has been verified against the Anthropic API.

**Plans**: TBD
**UI hint**: yes

### Phase 5: Administrador Email Ingestion

**Goal**: Administraciones Colmenarejo emails turn themselves into draft Documents and OpenLoops waiting in the cockpit for Nicola to confirm or discard — no manual re-keying.
**Mode:** mvp
**Depends on**: Phase 1 (OpenLoop store); Phase 2 (Document store + Blob upload)
**Requirements**: INGEST-02
**Success Criteria** (what must be TRUE):

  1. Running the extended `scripts/email-organizer/` pipeline picks up Administraciones Colmenarejo emails and their attachments and produces draft Documents / OpenLoops for the cockpit.
  2. Nicola sees incoming drafts in a review queue in the cockpit, kept separate from confirmed records.
  3. A draft becomes a real Document / OpenLoop only after Nicola confirms it; he can edit fields before confirming, or discard it.
  4. Nothing from an email is written directly into the live OpenLoop list without Nicola's confirmation (propose-then-confirm).

**Plans**: TBD
**UI hint**: yes

## Sequencing Notes & Risks

- **Private Blob store + proxy (Phases 1, 2, 5):** Copy `lib/cv/profile-store.ts` exactly — private access, `useCache: false`, `addRandomSuffix: false`, `allowOverwrite: true`. Never the `@vercel/blob` docs' `access: "public"` examples (that regressed silently once). Serve every PDF through a proxy route like `app/api/cv/versions/[id]/pdf/route.ts`; never hand the browser a blob URL.
- **Auth token (Phase 1):** `DASHBOARD_TOKEN` must be set in every environment. The login route's random-UUID fallback fails open on weak-checked routes and closed on strong-checked ones. The shared `requireAuth()` helper covers new `/api/community/*` routes only — the existing `/api/cv/*` weak-auth holes are explicitly out of scope for this milestone.
- **Next.js 16 (Phase 1):** This major is ahead of training data. Read `node_modules/next/dist/docs/` before any routing/caching/layout work (`AGENTS.md`).
- **Anthropic model IDs (Phase 4):** Repo uses non-standard IDs (`claude-opus-4-8`, `claude-sonnet-4-6`) via `client.beta.messages.create` with `betas: [...]`. Phase 4 centralises the client + model IDs + beta flags in one `lib/community/anthropic.ts` and verifies every ID against the Anthropic API before use. `@anthropic-ai/sdk` is floating (`^0.105.0`) and leans on pre-GA beta APIs — pin it.
- **LLM on untrusted documents (Phases 4, 5):** Acta PDFs and administrador emails are untrusted input to a model that could create/modify records. Every extraction/ingestion path is propose-then-confirm, never auto-commit. AI extraction of acuerdos from actas is explicitly v2 (EXTRACT-01) — v1 stays manual entry with documents attached.
- **Email-organizer runtime (Phase 5):** `scripts/email-organizer/` is a local/manual Python runtime, not deployed. Phase 5 extends it and must define how its output reaches the cockpit (write to a drafts Blob-JSON store or an authenticated `/api/community/*` call). The Google Drive integration is broken (`GOOGLE_REFRESH_TOKEN` dead) — Phase 5 must not depend on it.
- **No test infrastructure:** No runner, no CI. Not a blocker for these MVP slices; any testing this project wants is set up from scratch.
- **Single-user, single-writer JSON:** Whole-file rewrites, no locking — acceptable for v1. The constraint breaks at the neighbour portal (v2), which is why PLAT-03 keeps `OpenLoop` / `Submission` separate now.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Cockpit Foundation & Open-Loop Tracker | 3/3 | Complete    | 2026-09-10 |
| 2. Documents & Presupuestos Workflow | 0/3 | Planned | - |
| 3. LPH Deadline Engine | 0/TBD | Not started | - |
| 4. Claude-Assisted Advice (LPH Q&A + Presupuesto Pricing) | 0/TBD | Not started | - |
| 5. Administrador Email Ingestion | 0/TBD | Not started | - |

---
*Roadmap created: 2026-09-08*
