---
phase: 01
slug: cockpit-foundation-open-loop-tracker
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-10
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (all three PLAN.md files carry a `<threat_model>` block).
> Verified L1 (grep-depth) — short-circuit rule applied (threats_open: 0, register authored at plan time, ASVS L1).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → `/community-president` pages | Untrusted visitor; only the `dashboard_auth` httpOnly cookie separates public from private | Session cookie |
| browser / `curl` → `/api/community/*` Route Handlers | Untrusted request body + cookie; every mutation of an OpenLoop enters here | JSON loop data (may quote neighbour names/emails), auth cookie |
| Route Handler → Vercel Blob (private) / local `data/*.json` | Whole-file rewrite of a single private document; a bad write corrupts every loop at once | Full OpenLoop collection |
| stored loop free text → rendered DOM (desktop + mobile drawer + slide-over) | `title` / `next_action` / `owner_detail` are free text authored by Nicola but may contain third-party names | User-supplied strings |
| server render → client island | The grouped board is computed server-side then re-computed client-side; both must agree | Grouped OpenLoop arrays |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Spoofing / Elevation | `app/api/community/open-loops/route.ts` (GET, POST) | high | mitigate | `requireAuth(request)` is the literal first statement of both verbs (grep: 2 call sites); strict `===` vs `process.env.DASHBOARD_TOKEN`; returns 401 before body parse / store read | closed |
| T-01-02 | Elevation of Privilege | `app/community-president/layout.tsx` + `lib/community/require-auth.ts` | high | mitigate | Three-part fail-closed guard `!token \|\| !process.env.DASHBOARD_TOKEN \|\| token !== …` present in BOTH files (grep-confirmed) — closes the fail-open hole the `app/cv/layout.tsx` analog has (RESEARCH Pitfall 1). UAT test 4: `DASHBOARD_TOKEN` already set in Vercel | closed |
| T-01-03 | Denial of Service | `validateLoopInput` / Blob document | medium | mitigate | Length caps (title 200, next_action 2000, owner_detail 200) + non-object/array body rejection; bounds the single whole-file document | closed |
| T-01-04 | Tampering | `validateLoopInput` enum handling | medium | mitigate | Allow-list Sets derived from `Object.keys` of the single Spanish label record per enum; out-of-vocabulary kind/status/owner/source → 400 before store write | closed |
| T-01-05 | Tampering | `applyCreateDefaults` field selection | medium | mitigate | Fields picked explicitly by name; incoming body never spread — unknown keys never reach the stored document | closed |
| T-01-06 | Tampering | Blob pathname | low | mitigate | `BLOB_PATHNAME = "community-open-loops.json"` is a hard-coded module constant; no user input in any storage path | closed |
| T-01-07 | Information Disclosure | private Blob object | low | mitigate | `access: "private"` on both read and write (grep: 2); no Blob URL handed to the browser | closed |
| T-01-08 | Information Disclosure | Route Handler catch blocks / logs | low | mitigate | Only `err.message` returned in JSON; zero `console.*` calls carrying the request body / patch (grep-confirmed) — loop text can contain neighbour names (ASVS V7) | closed |
| T-01-09 | Tampering (stored XSS) | slide-over rendering loop free text | high | mitigate | `title` / `next_action` / `owner_detail` render as React text children; `dangerouslySetInnerHTML` grep-asserted absent across `app/components/community/` + `app/community-president/` | closed |
| T-01-10 | Tampering (stored XSS) | `LoopCard.tsx`, `NoDateSection.tsx` | high | mitigate | Same — all loop free text renders as React children; no raw-HTML prop | closed |
| T-01-11 | Denial of Service | `LoopColumn.tsx` render | low | mitigate | Column body `overflow-y-auto` with a bounded max-height (grep-confirmed); volume already capped upstream by the T-01-03 length caps + single-user store | closed |
| T-01-12 | Information Disclosure | initial board load failure | low | accept | Store helpers swallow read errors → empty board rather than an error trace (CONVENTIONS "never throw on read"). Confirmed acceptable at UAT test 1. See Accepted Risks R-01-01 | closed |
| T-01-13 | Tampering | timezone day-boundary mislabel | low | accept | Server UTC vs Europe/Madrid can shift a loop's bucket/label by one calendar day for ~2h around midnight. Documented in-code in `urgency.ts`. See Accepted Risks R-01-02 | closed |
| T-01-14 | Spoofing / Elevation | `app/api/community/open-loops/[id]/route.ts` (PATCH) | high | mitigate | `requireAuth(request)` is the literal first statement, before `ctx.params` is awaited / body parse / store read (grep: 1 call site, PATCH-only file) | closed |
| T-01-15 | Tampering (prototype pollution) | `applyPatch` in `lib/community/loop-defaults.ts` | high | mitigate | Next object built by copying the existing loop then reading ONLY `Object.freeze`'d `PATCHABLE_KEYS` via `Object.prototype.hasOwnProperty.call(patch, key)` (grep + code-review confirmed). Raw body never spread (grep: 0 `...patch` / `...body` anywhere) → `__proto__` / `constructor` structurally unreachable | closed |
| T-01-16 | Tampering (mass assignment) | `applyPatch` | medium | mitigate | Same allow-list: `id` / `created_at` / `source` / every LPH field are server-owned and cannot be set from the wire; `id` forced back to original on write | closed |
| T-01-17 | Tampering / data loss | the `/[id]` resource's HTTP surface | medium | mitigate | No DELETE handler anywhere under `app/api/community/` (grep-confirmed); "Descartar" = `PATCH {status:"dropped"}`, hidden by the plan-02 grouping (D-07). A compromised/mistaken client cannot destroy a record | closed |
| T-01-18 | Denial of Service | PATCH body size | medium | mitigate | `validateLoopInput` runs in non-create mode on every PATCH, re-applying the create length caps | closed |
| T-01-19 | Tampering (stored XSS) | `LoopSlideOver`, `QuickActions`, mobile drawer | high | mitigate | All loop free text renders as React text children; `dangerouslySetInnerHTML` grep-asserted absent | closed |
| T-01-20 | Tampering (CSRF) | PATCH / POST from a cross-site page | low | accept | `sameSite: "lax"` cookie + JSON content-type (not a simple form post) + same-origin `fetch`; accepted v1 posture for a single-user tool. Dedicated CSRF token is a v2 item alongside the neighbour portal. See Accepted Risks R-01-03 | closed |
| T-01-SC | Tampering (supply chain) | npm installs | high | mitigate | Zero new packages across all three plans — `git diff 4282b16..HEAD -- package.json package-lock.json` is empty. RESEARCH §"Package Legitimacy Audit": six pre-existing deps, all verdict OK, no `[ASSUMED]` / `[SUS]` / `[SLOP]` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `high` count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01-01 | T-01-12 | A Blob read failure degrades to an empty board (store helpers return `[]` on read error, per CONVENTIONS "never throw on read") rather than showing an error screen. For a single-user MVP this is acceptable; if it ever bites, a later phase wires the `No se han podido cargar los bucles` copy already in the UI-SPEC Copywriting Contract. Confirmed at UAT test 1. | Nicola (UAT 2026-09-10) | 2026-09-10 |
| R-01-02 | T-01-13 | Server runs UTC, Nicola is in Europe/Madrid — a loop due "today" can read one calendar day off for ~2h around midnight. Accepted ≤2h edge fuzz for a single-user tool; documented in `lib/community/urgency.ts`. Fix if needed: derive "today" as a Madrid-local `YYYY-MM-DD` and compare lexically. | Nicola (UAT 2026-09-10) | 2026-09-10 |
| R-01-03 | T-01-20 | No dedicated CSRF token on `POST`/`PATCH`. `sameSite: "lax"` + JSON content-type + same-origin `fetch` is an accepted posture for a single-user tool with no neighbour access. A CSRF token becomes a v2 requirement when the neighbour portal lands (REQUIREMENTS "Out of Scope" / RESEARCH §Security Domain). | Nicola (project constraint, v1) | 2026-09-10 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-10 | 20 | 20 | 0 | gsd-secure-phase (L1 short-circuit — register authored at plan time, ASVS L1, threats_open: 0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-10
