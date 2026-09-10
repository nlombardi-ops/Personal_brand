---
title: Onboarding — bootstrap the cockpit from the building's real history
captured: 2026-09-10
captured_from: Nicola, mid-session (after Phase 2 planned, before switching to CV work)
status: candidate phase — Nicola's stated next priority for the community side
priority: "Nicola: 'I want to be very clear that this should be the next phase for me.'"
does_not_replace: Phase 2 execution (and Phase 3) still need to be done — this is additive / a reprioritisation, not a cancellation
---

# Onboarding — bootstrap the cockpit from the building's real history

## The idea (Nicola's words, structured)

The cockpit today starts empty. Before it is useful, the president needs a **cold-start
bulk load** of everything that already exists about the building and its history, and the
initial backlog of open loops needs to fall out of that automatically instead of being
hand-typed.

Four steps:

1. **Import all context first, then interview.** Ingest what Nicola has access to and ask
   questions to build the full picture of the building: which administrador, the units /
   cuotas de participación, installations, common elements, warranties, ongoing contracts,
   and *what documents exist and where they live*. A guided discovery pass, not a blank form.

2. **Load everything from the administrador and past juntas.** Historical actas, administrador
   correspondence, contracts, account summaries — the paper trail that already exists.

3. **Attach the real paperwork.** Obras, presupuestos, incidencias, cartas — the documents
   themselves. (This is exactly what Phase 2 builds the Document / Presupuesto storage for.)

4. **Extract the to-dos from each junta automatically.** Every junta has agenda points,
   acuerdos, discussion threads and votes ("voices and topics"). Identify the actionable
   ones and **auto-create the OpenLoop buglist** — the dashboard that already exists — as
   propose-then-confirm drafts, never auto-committed.

Net effect: on day one the cockpit already reflects the building's true open state, seeded
from history, rather than being an empty tracker Nicola has to populate by hand.

## How this maps to the current roadmap

| This proposal | Existing roadmap item | Relationship |
|---|---|---|
| Step 1 — building-profile interview + document inventory | v2 **BLDG-01** (structured `Building` entity) | Pulls BLDG-01 forward; adds a guided discovery/interview step on top |
| Step 2 — historical acta / administrador import | Phase 3 (`Junta` recording), Phase 5 (`INGEST-02` administrador email ingestion) | Overlaps both; this is a *bulk historical* load, not the ongoing feed |
| Step 3 — attach obras / presupuestos / incidencias | **Phase 2** (Documents & Presupuestos Workflow) | Phase 2 is the storage substrate this step relies on — Phase 2 still ships first |
| Step 4 — auto-extract OpenLoops from junta content | v2 **EXTRACT-01** ("upload an acta → Claude proposes OpenLoop records → confirm/edit before save; never auto-commits") | This is EXTRACT-01, pulled forward from v2 and widened to "every past junta", plus the initial-backlog framing |

EXTRACT-01 was deliberately deferred to v2 with the rationale *"learn the real OpenLoop shape
from one junta cycle first"* (REQUIREMENTS.md, PROJECT.md "Out of Scope"). Nicola is now asking
to bring it forward and make it the centrepiece of an onboarding phase. That trade — extract
before a full manual cycle — is the main open question to resolve when this is discussed.

## Open questions for the discuss-phase when this is picked up

- **Sequencing.** Does this run *after* Phase 2 (needs the Document store) and *after* or
  *merged with* Phase 3 (needs the `Junta` model)? Or does it become a new phase inserted
  before Phase 3 that also delivers a minimal `Junta` shape?
- **EXTRACT-01 accuracy risk.** Research Q3 flagged LLM extraction accuracy on real actas as
  unproven. Propose-then-confirm is mandatory (untrusted-input constraint in `.claude/CLAUDE.md`).
  How much human review per extracted acuerdo is acceptable for a bulk backfill of N past juntas?
- **Scope of the "interview".** How structured — a fixed questionnaire, or Claude-led adaptive
  questioning like `/gsd-discuss-phase`? Where do the answers live (a `Building` record, or
  free-form context notes)?
- **How many past juntas.** All available history, or the last 1–2 years?
- **Document sourcing.** Nicola uploads manually (Phase 2 path) vs. the administrador email
  pipeline (Phase 5 path) vs. a one-time folder dump. Drive is broken (`GOOGLE_REFRESH_TOKEN`).
- **Does it become a new milestone?** This may be large enough to warrant `/gsd-new-milestone`
  rather than a single inserted phase.

## Next action when returning to the community side

Run `/gsd-explore` or `/gsd-new-milestone` (not `/gsd-plan-phase`) — this needs roadmap-level
shaping first: it reprioritises v2 items (EXTRACT-01, BLDG-01) into near-term work and overlaps
Phases 3 and 5. Phase 2 execution (`/gsd-execute-phase 2`) is unaffected and still comes first.
