---
phase: quick-260917-pjc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/email-organizer/config.example.json
  - scripts/email-organizer/sync_bills.py
  - lib/types.ts
  - data/bills.json
  - lib/drive/parsers.ts
  - lib/drive/sync.ts
  - app/api/dashboard/sync/route.ts
  - app/dashboard/bills/page.tsx
  - app/components/dashboard/BillsTable.tsx
autonomous: true
requirements: [QUICK-INS-01]

must_haves:
  truths:
    - "The email→Drive→dashboard pipeline has a fourth category, Insurance, scaffolded end to end: config template → Drive folder slot → parser → sync → bills.json → dashboard column."
    - "Nothing in the change fabricates data: the Insurance Drive folder ID is an explicit null placeholder, the Adeslas sender list is an empty array, and the parser returns null instead of guessing an amount."
    - "`npx tsc --noEmit` and `npm run lint` both pass with the new category wired in (strict TypeScript, no `any`)."
    - "Existing energy/internet/community sync behaviour is byte-for-byte unchanged — the insurance path is inert until a folder ID is pasted in."
    - "The dashboard bills table renders an Insurance column that reads as empty (—) today and fills in automatically once real bills land."
  artifacts:
    - "lib/types.ts — `InsuranceBill` interface + optional `insurance` array on `BillsData`"
    - "lib/drive/parsers.ts — `parseAdeslasBill` conservative stub"
    - "lib/drive/sync.ts — `FOLDERS.insurance` placeholder + `syncInsurance` + widened `syncBills`/`SyncResult`"
    - "scripts/email-organizer/config.example.json — `Insurance` provider entry"
    - "data/bills.json — `insurance: []` seed key"
  key_links:
    - "config.example.json `providers` key name → the Drive folder name organizer.py auto-creates via find_or_create_folder → the folder whose ID goes into `FOLDERS.insurance`"
    - "`BillsData.insurance` optional-ness → `getBillsData()` reading pre-existing Blob/JSON documents that predate the field (a required field would type-lie and crash on `.length`)"
    - "`parseAdeslasBill` returning null → `syncInsurance`'s per-file try/catch skip → no wrong money written into bills.json"
---

<objective>
Scaffold a fourth "Insurance" (Adeslas / seguros) category through the existing
email→Drive→dashboard bill pipeline, so the only work left for the user is data entry,
not wiring.

Purpose: today the pipeline knows three categories (phone_internet, community, energy).
The user wants Adeslas receipts to land on the dashboard the same way. This plan lays every
piece of wiring — config template entry, Drive folder slot, parser, sync branch, type,
dashboard column — so that after execution the user only has to (a) add the real Adeslas
sender address to their local gitignored `config.json`, (b) run `organizer.py` once to
create the Drive folder and land real emails, (c) paste the resulting folder ID into
`FOLDERS.insurance`, and (d) tighten `parseAdeslasBill`'s regexes against a real sample.

Output: nine touched files, no new abstractions, no new dependencies, no network calls.

**This is code scaffolding, not a live sync.** Do not run `organizer.py`, `sync_bills.py`,
`monthly_update.sh`, or anything that touches IMAP / Google Drive / the network. No
`config.json`, `venv/`, or `token.json` exists in this checkout, and `GOOGLE_REFRESH_TOKEN`
is known-broken (`invalid_grant`). Do not invent or write a Drive folder ID that looks real.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md

Read before editing (all are short; read each once):
@lib/drive/parsers.ts
@lib/drive/sync.ts
@lib/types.ts
@scripts/email-organizer/config.example.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Config template entry, InsuranceBill type, and bills.json seed key</name>
  <files>scripts/email-organizer/config.example.json, lib/types.ts, data/bills.json, scripts/email-organizer/sync_bills.py</files>
  <action>
Four small, independent edits. Do not restructure any file.

1. `scripts/email-organizer/config.example.json` — add a fourth entry to the `providers`
map, placed after `"Energy"`, exactly mirroring the shape of the existing entries:
a key named `Insurance` whose value is an object with a single `senders` key holding an
empty array. The empty array is deliberate and load-bearing: the real Adeslas sender
address is personal data that belongs only in the user's gitignored `config.json`, and
`organizer.py` derives the Google Drive folder name from this map key via
`find_or_create_folder` — no folder ID is hardcoded anywhere in the Python side, so the
key name is the entire contract. Keep the existing three entries untouched, keep 2-space
indentation, and keep the file valid JSON (no trailing comma, no comments — JSON has none).

2. `lib/types.ts` — under the existing `// ── Dashboard ──` banner, add an `InsuranceBill`
interface immediately after `InternetBill` and before `BillsData`. Fields, in this order:
`month: string`, `total: number`, `provider: string`, and an optional `policy?: string`
(the human-readable policy label, e.g. hogar vs. salud, when the document states one).
Deliberately narrow: only fields a conservative parser can honestly extract from an
unseen template. Do not mirror `InsurancePolicy` — that interface models static policy
metadata (premiums, coverage, renewal dates) read from `data/insurance.json`, a different
thing from a time series of billed receipts.

Then add an `insurance` array to `BillsData` — declared **optional** (`insurance?:
InsuranceBill[]`), unlike its three required siblings. Add a short why-style comment above
it (2 lines max, no JSDoc — this repo has none) explaining that the production Vercel Blob
`bills.json` and the committed seed both predate this field, so a required declaration
would type-lie about documents already sitting in the store and blow up on `.length` at
runtime. Every other interface in the file uses `interface` declarations with no export
comments — match that.

3. `data/bills.json` — add a top-level `"insurance": []` key alongside the existing
`energy`, `internet`, and `community` arrays. Match the file's existing 2-space
indentation. Do not touch any existing bill entry.

4. `scripts/email-organizer/sync_bills.py` — **comment-only change, zero behaviour
change.** Inside the `FOLDERS` dict (around line 36-40) there is already a commented-out
placeholder line for the energy category recording that its folder ID was never
identified. Add one more commented-out line in the same style for the insurance category,
recording that the insurance category lives on the TypeScript side (`lib/drive/sync.ts`)
only. This script is still load-bearing — `monthly_update.sh` invokes
`python sync_bills.py all` — but it already lags the TS pipeline by a whole category
(energy), so we are matching that precedent rather than hand-writing a second, pdfplumber
Adeslas parser we cannot test. Do not add any executable Python.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && node -e "const c=require('./scripts/email-organizer/config.example.json'); if(!c.providers.Insurance||!Array.isArray(c.providers.Insurance.senders)||c.providers.Insurance.senders.length!==0) throw new Error('Insurance provider entry missing or not an empty senders array'); const b=require('./data/bills.json'); if(!Array.isArray(b.insurance)) throw new Error('bills.json insurance key missing'); if(!b.energy||!b.internet||!b.community) throw new Error('existing bills.json categories were damaged'); console.log('ok')" && grep -q "InsuranceBill" lib/types.ts && npx tsc --noEmit
    </automated>
  </verify>
  <done>
`config.example.json` has an `Insurance` provider with an empty `senders` array and the
other three providers intact. `lib/types.ts` exports `InsuranceBill` and `BillsData` has
an optional `insurance` array with a comment explaining why it is optional.
`data/bills.json` has `"insurance": []` and all pre-existing bill entries unchanged.
`sync_bills.py` differs only by one comment line. `npx tsc --noEmit` exits 0.
  </done>
</task>

<task type="auto">
  <name>Task 2: Conservative parseAdeslasBill stub + Drive sync wiring</name>
  <files>lib/drive/parsers.ts, lib/drive/sync.ts, app/api/dashboard/sync/route.ts</files>
  <action>
**`lib/drive/parsers.ts`** — append a new section at the end of the file with a section
banner comment matching the existing style (the file already has banners for text
extraction, Pepephone/MasMovil, Community, and MasMovil Luz y Gas). Export
`parseAdeslasBill(text: string)` returning the same shape style as its three siblings —
i.e. the bill interface or `null`. Import `InsuranceBill` from `@/lib/types` alongside the
existing type imports.

Implementation rules, in order:
- Call `normalizeText(text)` first, exactly like the other three parsers.
- Amount: try a short ordered list of label-anchored Spanish patterns (roughly three),
  each requiring an explicit label token near a two-decimal amount and a euro sign —
  e.g. an "Importe" label, a "Total"/"Total a pagar" label, a "Recibo"/"Prima" label.
  Reuse the sibling parsers' exact numeric idiom: a `\d+[.,]\d{2}` capture run through
  `parseFloat(m[1].replace(",", "."))`.
- Date: derive `month` as `YYYY-MM`. Try an emission-date pattern (the Spanish "fecha de
  emisión" wording, using `.` for the accented character exactly as the existing parsers
  do to dodge encoding variance) and a billing-period end-date pattern, both yielding
  `${year}-${month}`. You may also reuse the module-level `MONTH_MAP_ES` for a
  Spanish-month-name form. Stop at two or three attempts.
- **Bail honestly.** If either the amount or the month is missing, return `null` — same
  final guard the other three parsers use. Critically: do **not** add a catch-all fallback
  that grabs the first euro amount or the first date anywhere in the document. On a
  template nobody has ever seen, such a fallback would silently capture a coverage limit,
  a tax base, or a renewal date and write wrong money into `bills.json` — worse than
  extracting nothing, because it looks correct on the dashboard. Returning `null` for
  every real file until the regexes are tightened is the intended, correct behaviour of
  this stub.
- `provider` is the Adeslas insurer string (match how `data/insurance.json` already names
  it). Leave `policy` undefined unless a label pattern trivially yields one.
- Add a why-style comment block above the function (no JSDoc — this repo has none)
  stating plainly that these patterns are unverified guesses because no sample Adeslas
  document exists in the repo, unlike the three sibling parsers whose regexes were
  reverse-engineered from real invoices; and pointing at the concrete refinement path:
  drop a real captured file into the Drive folder and dump its extracted text with the
  existing peek/debug mode of `scripts/email-organizer/sync_bills.py` (see that script's
  usage header), then tighten these patterns against what actually comes out.

**`lib/drive/sync.ts`** — four edits:
- Extend the imports: add `parseAdeslasBill` to the parsers import and `InsuranceBill` to
  the type import.
- Add an `insurance` entry to the `FOLDERS` object whose value is `null`, typed so the
  object still infers the three siblings as `string` (annotate the single entry, e.g.
  `null as string | null`). Above it, a why-style comment: the folder does not exist in
  Drive yet — `organizer.py` creates it on its first run once an Insurance provider is
  present in the user's `config.json` — so paste the resulting ID here afterwards.
  **Never write a real-looking Drive ID here**; a fabricated 33-character ID would send
  the sync at a random or non-existent folder.
- Add a `syncInsurance` function mirroring `syncEnergy` exactly (list PDFs, download,
  `extractTextFromPdf`, parse, push when non-null, per-file try/catch skip, sort by
  month). Take the folder ID as a **required `string` parameter** rather than reading
  `FOLDERS.insurance` inside — that keeps the null-narrowing at the single call site and
  satisfies strict mode without a non-null assertion.
- In `syncBills`: add `"insurance"` to the `category` union parameter; read the current
  value defensively as `current.insurance ?? []` (the stored document may predate the
  field); guard the call as "category matches **and** the folder ID is truthy", passing
  the narrowed ID into `syncInsurance`; include `insurance` in the `storeBillsData(...)`
  object and in the returned `synced` counts. Extend the exported `SyncResult` interface
  with `insurance: number`.

**`app/api/dashboard/sync/route.ts`** — in `POST`, add the insurance category to both the
local `category` variable's union annotation and the runtime allow-list array it is
validated against, so a targeted insurance-only sync can be triggered. Change nothing
else; the GET/cron path already passes `"all"`.

Do not run any sync, script, or network call as part of this task.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && grep -q "parseAdeslasBill" lib/drive/parsers.ts && grep -q "parseAdeslasBill" lib/drive/sync.ts && grep -q "syncInsurance" lib/drive/sync.ts && grep -qE "insurance:\s*null" lib/drive/sync.ts && ! grep -nE "insurance.*[\"'][A-Za-z0-9_-]{20,}[\"']" lib/drive/sync.ts && npx tsc --noEmit && npm run lint
    </automated>
  </verify>
  <done>
`parseAdeslasBill` exists, normalizes text, tries a handful of label-anchored patterns,
returns `null` when unsure, and carries the comment naming the refinement path.
`lib/drive/sync.ts` has a null `FOLDERS.insurance` placeholder (no fabricated ID), a
`syncInsurance` taking a `string` folder ID, and a `syncBills` that reads
`current.insurance ?? []`, only syncs when the ID is set, and reports an `insurance` count
in `SyncResult`. The POST sync route accepts `insurance` as a category. `npx tsc --noEmit`
and `npm run lint` both exit 0, and the three existing category paths are untouched.
  </done>
</task>

<task type="auto">
  <name>Task 3: Insurance column on the dashboard bills table</name>
  <files>app/dashboard/bills/page.tsx, app/components/dashboard/BillsTable.tsx</files>
  <action>
Minimal, pattern-consistent display so real Adeslas bills surface automatically once they
land — no new components, no new abstractions.

**`app/dashboard/bills/page.tsx`** — in `buildRows()`, feed the insurance months into the
same `months` Set the other three categories populate, look up that month's insurance
total the same way the internet lookup does, and include it both as its own row field and
in the row's `total` sum. Because `BillsData.insurance` is optional (Task 1), every access
must be optional-chained and defaulted (the page reads a statically imported
`data/bills.json` cast to `BillsData`, so this is a compile-time concern too). Also pass
the new field through the object literal handed to `BillsTable`.

Deliberately **out of scope — do not change**: the `StatCard` grid (it is a
`lg:grid-cols-4` row of exactly four cards; a fifth breaks the layout) and
`StackedBarChart` (adding an always-empty series would put a dead entry in the chart
legend). Both become worthwhile only once real data exists; leave them alone and say so in
the summary.

**`app/components/dashboard/BillsTable.tsx`** — add `insurance: number` to the local
`BillRow` interface, then add the matching header cell, body cell, and footer-total cell,
positioned after the internet column and before the total column so header, body, and
footer stay aligned. Copy the internet column's markup exactly, swapping only the label
and the color token — pick a color not already in use in this table (amber/emerald/cyan/
indigo are taken; a rose token keeps it distinguishable), applied consistently across all
three cells. The file's existing `fmt` helper already renders `0` as an em dash, so the
column reads as empty until real bills arrive — that is the intended look today.

Keep the existing `"use client"` directive, the stone-* palette, and the current
formatting conventions (2-space indent, double quotes, semicolons).
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && grep -q "insurance" app/dashboard/bills/page.tsx && grep -c "insurance" app/components/dashboard/BillsTable.tsx | awk '$1>=4{exit 0} {exit 1}' && npx tsc --noEmit && npm run lint
    </automated>
  </verify>
  <done>
The bills table shows a fifth category column between Internet and Total, rendering an em
dash in every row today. `BillRow` carries `insurance: number`; header, body, and footer
cell counts match. `StatCard` grid and `StackedBarChart` are untouched. `npx tsc --noEmit`
and `npm run lint` both exit 0.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Adeslas email/PDF → `parseAdeslasBill` | Attacker-influencable document content (anyone can email the user) becomes numbers rendered as the user's own financial history |
| Drive folder ID constant → `syncInsurance` | A wrong or fabricated ID silently points the sync at unrelated documents |
| Local `config.json` (gitignored) → committed `config.example.json` | Personal sender addresses / IMAP credentials must never cross into the repo |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-INS-01 | Tampering | `parseAdeslasBill` | medium | mitigate | Label-anchored patterns only, no catch-all "first euro amount" fallback; return `null` when unsure so a crafted or merely unexpected document cannot inject a bogus total into `bills.json` (Task 2) |
| T-INS-02 | Denial of Service | `syncInsurance` | low | mitigate | Per-file try/catch skip copied from `syncEnergy` — one malformed PDF cannot abort the whole sync run |
| T-INS-03 | Information Disclosure | `config.example.json` | medium | mitigate | `senders` ships as an empty array; the real Adeslas address stays in the gitignored `config.json` (Task 1) |
| T-INS-04 | Spoofing | `FOLDERS.insurance` | medium | mitigate | Explicit `null` placeholder plus a truthiness guard at the call site — the sync is inert rather than pointed at a fabricated folder ID (Task 2) |
| T-INS-05 | Elevation of Privilege | `POST /api/dashboard/sync` | low | accept | The new category flows through the route's existing strong `DASHBOARD_TOKEN` cookie check and a fixed allow-list array; no new surface is added |

No package-manager installs in this plan, so no supply-chain legitimacy gate applies.
</threat_model>

<verification>
Run from the repo root after all three tasks:

1. `npx tsc --noEmit` — exits 0 (strict mode; this touches `lib/types.ts`, `lib/drive/*`,
   and two `.tsx` consumers).
2. `npm run lint` — exits 0 (the repo's only lint entry point; there is no `typecheck`
   or `test` script, and no test runner exists — do not invent one).
3. `git diff --stat` — exactly the nine files in `files_modified`, nothing else.
4. Manual inspection (no test infrastructure exists, so this is the real gate):
   - `grep -n "insurance" lib/drive/sync.ts` — the folder ID is `null`, never a
     real-looking Drive ID.
   - `grep -n "senders" scripts/email-organizer/config.example.json` — the Insurance
     entry's array is empty; no personal address was committed.
   - `git diff scripts/email-organizer/sync_bills.py` — comment lines only.
   - `git diff data/bills.json` — one added key, no mutated bill entries.
5. **Do not run** `organizer.py`, `sync_bills.py`, `monthly_update.sh`, or
   `POST /api/dashboard/sync`. There is no `config.json`, no `venv/`, no `token.json` in
   this checkout, and `GOOGLE_REFRESH_TOKEN` is known-broken (`invalid_grant`).
</verification>

<success_criteria>
- [ ] `config.example.json` carries an `Insurance` provider with an empty `senders` array
- [ ] `InsuranceBill` exists in `lib/types.ts` under the Dashboard banner; `BillsData.insurance` is optional with a comment saying why
- [ ] `data/bills.json` has `"insurance": []`; existing entries untouched
- [ ] `sync_bills.py` changed by comment only
- [ ] `parseAdeslasBill` returns `null` rather than guessing, and documents the peek-based refinement path
- [ ] `FOLDERS.insurance` is `null` with a placeholder comment — no fabricated Drive ID anywhere
- [ ] `syncBills` / `SyncResult` / the POST sync route all know the insurance category, and the three existing category paths are byte-for-byte unchanged
- [ ] The bills table renders an Insurance column (em dash today); `StatCard` grid and `StackedBarChart` untouched
- [ ] `npx tsc --noEmit` and `npm run lint` both exit 0
- [ ] Nothing was executed against IMAP, Google Drive, or the network

**Handoff note for the summary** — spell out the four remaining manual steps for the user:
(1) add the real Adeslas sender to the local `config.json`, (2) run `organizer.py` once to
create the Drive folder and land real emails, (3) paste that folder's ID into
`FOLDERS.insurance` in `lib/drive/sync.ts`, (4) tighten `parseAdeslasBill`'s patterns
against a real sample. Until step 3, the insurance sync is intentionally inert.
</success_criteria>

<output>
Create `.planning/quick/260917-pjc-add-insurance-adeslas-sync-category-conf/260917-pjc-SUMMARY.md` when done.
</output>
