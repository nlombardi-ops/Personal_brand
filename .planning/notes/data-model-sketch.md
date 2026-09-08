---
title: Smart Community President — data model sketch
date: 2026-09-08
context: /gsd-explore session — early entity sketch, not final
---

# Data model sketch

Early thinking from the exploration. Not a schema decision — input for `/gsd-new-project`
and the eventual plan-phase.

## Core entity: `OpenLoop`

The thing Nicola tracks. A commitment, an incidencia, a pending work, a follow-up.

Candidate fields:

- `id`
- `title` — short human summary
- `kind` — `commitment` | `incidencia` | `obra` | `follow_up` | `permiso`
- `status` — `open` | `waiting_on_other` | `blocked` | `done` | `dropped`
- `owner` — who must act next: `me` | `neighbour` | `administrador` | `provider` | `junta`
- `owner_detail` — free text (which neighbour, which provider)
- `source` — where it came from: `acta` | `email` | `manual` | `neighbour_form` (future)
- `source_ref` — link/id to the originating acta or email thread
- `created_at`, `updated_at`
- `next_action` — the single next step
- `due` — soft deadline Nicola sets

### LPH-aware fields (when the loop is tied to a junta acuerdo)

- `acuerdo_id`
- `acta_date`
- `majority_type` — `simple` | `doble_simple` | `tres_quintos` | `simple_total` | `un_tercio` | `unanimidad`
- `majority_achieved` — bool
- `ejecutividad_date` — acta closure date; acuerdo is executable from here
- `impugnacion_deadline` — auto-computed: `ejecutividad_date` + 3 meses
  (or + 1 año if `contrario_a_ley_estatutos`)
- `ausentes_notified_at` — starts the impugnación clock for absent owners
- `budget_annual` and `mensualidad_ordinaria` → derived flag
  `accesibilidad_obligatoria` when `budget_annual <= 12 * mensualidad_ordinaria`

## Supporting entities

- `Document` — an ingested acta / contract / presupuesto / carta. `type`, `date`,
  `file_ref` (Blob), `extracted_text`, `linked_loops[]`.
- `Presupuesto` — a quote for an `OpenLoop` of kind `obra`. `provider`, `amount`,
  `scope`, `received_at`, `valid_until`, `doc_ref`. Enables side-by-side comparison
  (pillar 3).
- `Junta` — a meeting. `date`, `type` (`ordinaria` | `extraordinaria`), `convocatoria_sent_at`,
  `acta_doc_ref`, `acuerdos[]`.
- `Building` (later) — structured facts: units, cuotas de participación, common
  elements, installations, warranties. Feeds more accurate estimates (pillar 4).

## Forward-compatibility for the neighbour portal

- `OpenLoop.source = neighbour_form` and a `Submission` entity (`submitter_name`,
  `submitter_unit`, `description`, `photos[]`, `status = triage`) that a neighbour
  can see only for their own submission.
- Keep all president-internal fields (LPH data, owner routing, presupuestos) on
  `OpenLoop`, not on `Submission`, so exposing the form later does not leak internals.
