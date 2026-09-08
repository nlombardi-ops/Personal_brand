---
title: Smart Community President — exploration findings
date: 2026-09-08
context: /gsd-explore session before /gsd-new-project
---

# Smart Community President — exploration findings

Feature inside the `Personal_brand` app. Fork to its own repo later if it proves out
and looks publicly useful. Nicola just became president of his comunidad de propietarios
and wants to turn the admin burden into something productive and fun.

## The reframe

The idea started as five pillars (actas/document repo, issue tracker with permissions +
presupuestos workflow, AI price-benchmarking scraper, structured building dataset,
normativa/compliance expert). Through questioning it collapsed:

- **The core is an open-loop / commitment tracker, not a document archive.**
  When Nicola reaches for this mid-role, he is trying to answer *"what did I promise to
  follow up on, and what is pending my action or a neighbour's response?"* — not
  *"where is that PDF."*
- **The administrador de fincas holds the official system of record** (actas, contracts,
  accounts). Nicola's pain is that he gets them slowly, in scattered emails and PDFs,
  with no overview. So this product is **the president's private intelligence layer on
  top of the administrador**, not a replacement for the administrador's ERP.
- **Raw input is mostly email + forwarded PDFs** landing in Nicola's inbox. The
  `Personal_brand` app already has an email-organizer script and a bill-sync pipeline,
  so the ingestion muscle partly exists.
- **Pillars 1 and 2 merge.** "Get 3 quotes for the garage door" is just an open loop
  with a presupuestos sub-workflow. The issue tracker and the commitment tracker are
  the same entity.
- **Pillar 3 is validated by the market** — Ciudadela already auto-compares presupuestos
  for works. It is administrador-facing, not president-facing.

## Scope phasing

- **v1 — private president's cockpit.** Single user (Nicola). He feeds it and acts on
  its output. No neighbour or administrador access.
- **Data model must be designed so a neighbour-facing incidencia intake form bolts on
  later without a rewrite.** See seed `neighbour-incidencia-portal`.
- v1 lives as a feature inside `Personal_brand`; the neighbour-portal moment is the
  candidate trigger to fork to its own repo.

## LPH gives the open loops legal teeth

From research (Ley de Propiedad Horizontal — see sources in
`.planning/research/questions.md`):

| Thing | Rule |
|---|---|
| Acta closed | within **10 días naturales**; acuerdos ejecutivos from closure (art. 19) |
| Convocatoria ordinaria | min. **6 días** antelación; ≥1 junta ordinaria per year (art. 16) |
| 2ª convocatoria | ½ hour later (no quorum) or re-convened within 8 días / 3 días notice |
| Owners can force a junta | 25% of propietarios or cuotas |
| Majorities (art. 17) | general = doble mayoría simple; nuevos servicios / portería / toldos = **3/5**; accesibilidad + ascensor = mayoría simple del total; utility individual (gas, telecom) = **1/3**; estatutos / título = unanimidad |
| Accessibility works | **obligatorias sin acuerdo** if annual cost ≤ **12 mensualidades** ordinarias, net of subsidies (art. 10) |
| Impugnación de acuerdos | caducidad **3 meses** (1 año if contrario a ley/estatutos); ausentes count from notification; does not suspend execution (art. 18) |
| Presidente term | **1 year** unless estatutos say otherwise |

## Market gap

- **Administrador ERPs** (Gesfincas / TuComunidad, Cegid Finca3, Fincaspro, Adcomunidad):
  strong on contabilidad, recibos, conciliación, convocatorias. Weak on structured
  commitment tracking and works price benchmarking.
- **Resident apps** (Fincapp ~9,90 €/comunidad flat, Comunidad365, Neivos): incidencias,
  docs, reservas, comms. No legal-deadline logic, no acta intelligence.
- **AI entrants** (FincAI — extracts acuerdos/votaciones/puntos pendientes, drafts acta;
  Adcomunidad "qué tienes pendiente" dashboards; Ciudadela — auto-compares presupuestos):
  still administrador-facing, not president-facing.
- **Who pays today:** administrador honorarios 4–12 €/vivienda/año, paid by the comunidad;
  the administrador picks the ERP. Resident apps billed to the comunidad.
- **The gap:** nobody sells a president's private cockpit that tracks open loops with
  LPH deadline awareness, independent of the administrador.
