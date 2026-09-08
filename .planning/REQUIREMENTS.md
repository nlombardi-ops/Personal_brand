# Requirements: Smart Community President

**Defined:** 2026-09-08
**Core Value:** At any moment the president can see every open commitment and incidencia, who it is waiting on, and which LPH deadline is closing in — without digging through email.

## v1 Requirements

Requirements for the initial private president's cockpit. Each maps to a roadmap phase.

### Open Loops

- [ ] **LOOP-01**: User can create and edit an `OpenLoop` with kind (commitment / incidencia / obra / follow_up / permiso), status (open / waiting_on_other / blocked / done / dropped), owner (me / neighbour / administrador / provider / junta), next action, and soft due date
- [ ] **LOOP-02**: User can attach one or more `Document`s (acta / contract / presupuesto / carta) to an OpenLoop and open them in the browser
- [ ] **LOOP-03**: User can record multiple `Presupuesto`s on an obra-kind OpenLoop (provider, amount, scope, received/valid dates, document) and compare them side by side
- [ ] **LOOP-04**: User sees a passive cockpit view of OpenLoops grouped by due / overdue / waiting-on-others, sorted by urgency, on opening the surface

### LPH Engine

- [ ] **LPH-01**: User can record a `Junta` (date, type ordinaria/extraordinaria, convocatoria sent date, acta document, acuerdos) and link an acuerdo to an OpenLoop
- [ ] **LPH-02**: System auto-computes each acuerdo's impugnación deadline (ejecutividad date + 3 meses, or + 1 año if flagged contrario a ley/estatutos)
- [ ] **LPH-03**: System auto-computes the acta closure window (10 días naturales from junta) and records a `majority_type` with whether it was achieved
- [ ] **LPH-04**: System derives an `accesibilidad_obligatoria` flag when annual works budget ≤ 12 × mensualidad ordinaria
- [ ] **LPH-05**: Computed LPH deadlines appear in the passive cockpit alongside soft due dates, contributing to urgency sort

### LPH Q&A

- [ ] **QA-01**: User can ask LPH questions in a chatbot grounded in LPH articles, multilingual (ES/EN/IT), with history trimmed to a recent window (Contracts Q&A assistant pattern)

### Pricing

- [ ] **PRICE-01**: User can request a Claude-with-web-search estimate of what a Presupuesto's kind of work typically costs in Spain — advisory text shown on the presupuesto, nothing stored or scraped

### Ingestion

- [ ] **INGEST-01**: User can upload a PDF into the cockpit; it is stored in the private Vercel Blob store and served back via a proxy route
- [ ] **INGEST-02**: The `scripts/email-organizer/` pipeline feeds administrador emails (Administraciones Colmenarejo) into the cockpit as draft `Document`s / OpenLoops

### Platform

- [ ] **PLAT-01**: The cockpit is a standalone `app/community-president/` surface with its own `layout.tsx` auth gate (mirroring `app/cv/layout.tsx`) and its own sidebar
- [ ] **PLAT-02**: Every `/api/community/*` route enforces authentication via a shared `requireAuth()` helper doing a strong `=== DASHBOARD_TOKEN` comparison
- [ ] **PLAT-03**: The data model keeps `OpenLoop` and a future `Submission` separate — president-internal fields (LPH data, owner routing, presupuestos) live only on `OpenLoop`, and `OpenLoop.source` supports a `neighbour_form` value — so a neighbour intake form can be added later without a rewrite

## v2 Requirements

Deferred to a future milestone. Tracked, not in the current roadmap.

### AI Extraction

- **EXTRACT-01**: Upload an acta → Claude proposes OpenLoop records (acuerdos, pending points, responsible parties) → user confirms/edits before save; never auto-commits

### Pricing & Building Data

- **PRICE-02**: Full price-benchmarking against Spanish works-pricing sources (scraper or dataset)
- **BLDG-01**: Structured `Building` entity — units, cuotas de participación, common elements, installations, warranties

### Reminders

- **REMIND-01**: Weekly digest — a Vercel cron emails a Monday summary of pending loops and upcoming LPH deadlines
- **REMIND-02**: Per-OpenLoop configurable reminders that notify (email) ahead of a due date or LPH deadline

### Neighbour Portal

- **PORTAL-01**: Public incidencia intake form + `Submission` entity a neighbour sees only for their own submission (seed: `.planning/seeds/neighbour-incidencia-portal.md`)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing the administrador's ERP / system of record | Administrador keeps official actas, contracts, accounts; this is a private layer on top |
| AI extraction of actas in v1 | Learn the real `OpenLoop` shape from one junta cycle first; propose-then-confirm design (Research Q3) — moved to v2 EXTRACT-01 |
| Full price-benchmarking scraper / dataset in v1 | Market-validated but administrador-facing; lightweight per-presupuesto estimate (PRICE-01) covers v1 — moved to v2 PRICE-02 |
| Structured Building dataset in v1 | Not needed for open-loop tracking — moved to v2 BLDG-01 |
| Scheduled reminders / notifications in v1 | v1 deadline awareness is passive (shown on open) — moved to v2 REMIND-01/02 |
| Google Drive folder sync for ingestion | Existing Drive integration is broken (`GOOGLE_REFRESH_TOKEN` dead); administrador input arrives by email |
| Multi-writer / per-owner identity / real database | Comes with the neighbour portal; v1 is single-user single-writer JSON |
| Fixing existing `/api/cv/*` weak-auth holes + root `middleware.ts` | Separate cleanup; this milestone adds a strong check on new routes only |
| Forking Smart Community President to its own repo | Same trigger as the portal — one full junta cycle of real use |

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LOOP-01 | Phase 1 | Pending |
| LOOP-02 | Phase 2 | Pending |
| LOOP-03 | Phase 2 | Pending |
| LOOP-04 | Phase 1 | Pending |
| LPH-01 | Phase 3 | Pending |
| LPH-02 | Phase 3 | Pending |
| LPH-03 | Phase 3 | Pending |
| LPH-04 | Phase 3 | Pending |
| LPH-05 | Phase 3 | Pending |
| QA-01 | Phase 4 | Pending |
| PRICE-01 | Phase 4 | Pending |
| INGEST-01 | Phase 2 | Pending |
| INGEST-02 | Phase 5 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

**Phase distribution:**
- Phase 1 — Cockpit Foundation & Open-Loop Tracker: PLAT-01, PLAT-02, PLAT-03, LOOP-01, LOOP-04
- Phase 2 — Documents & Presupuestos Workflow: INGEST-01, LOOP-02, LOOP-03
- Phase 3 — LPH Deadline Engine: LPH-01, LPH-02, LPH-03, LPH-04, LPH-05
- Phase 4 — Claude-Assisted Advice (LPH Q&A + Presupuesto Pricing): QA-01, PRICE-01
- Phase 5 — Administrador Email Ingestion: INGEST-02

---
*Requirements defined: 2026-09-08*
*Last updated: 2026-09-08 after roadmap creation — 16/16 v1 requirements mapped across 5 phases*
