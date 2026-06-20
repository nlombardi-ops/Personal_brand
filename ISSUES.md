# GitHub Issues — Dashboard Automation + CV Generator

Copy each block into GitHub → Issues → New Issue, or re-run once the PAT has `issues` write scope.

---

## A1 — Move email-organizer scripts into repo under /scripts/

**Type:** HITL · **Blocked by:** Nothing

### What to build

Move the email-organizer pipeline from `~/Downloads/email-organizer/` into `/scripts/email-organizer/` inside this repo. Replace all hardcoded paths (`DASHBOARD_DIR`, `ORGANIZER_DIR`) with env-var-based paths so the scripts work from any machine.

The pipeline already works end-to-end:
- `organizer.py` reads iCloud Mail via IMAP for bill PDFs
- `sync_bills.py` reads Drive folders → parses PDFs with pdfplumber → writes `data/bills.json`
- `monthly_update.sh` orchestrates both + commits + pushes to GitHub

This issue is just about making it version-controlled and portable.

### Acceptance criteria

- [ ] `/scripts/email-organizer/` exists in the repo with all scripts and `requirements.txt`
- [ ] Sensitive files (`credentials.json`, `token.json`, `config.json`, `processed.json`) are in `.gitignore`
- [ ] A `config.example.json` documents the expected shape without real credentials
- [ ] `DASHBOARD_DIR` and `ORGANIZER_DIR` are read from env vars with sensible defaults
- [ ] `monthly_update.sh` runs successfully from the new location
- [ ] `SETUP.md` in `/scripts/email-organizer/` documents one-time setup and monthly run

---

## A2 — Schedule monthly cowork to run the sync pipeline

**Type:** HITL · **Blocked by:** A1

### What to build

Set up a Claude Code scheduled session (via `/schedule`) that runs on the 1st of each month. The session executes the full sync pipeline: `python sync_bills.py all` → commits any updated JSON → pushes to GitHub → Vercel auto-deploys.

Requires confirming that the cowork environment has access to the Google Drive credentials and the correct Python venv.

### Acceptance criteria

- [ ] A scheduled cowork is configured to run on the 1st of each month
- [ ] The cowork prompt includes the sync command, expected output, and what to do on error
- [ ] A dry-run has been verified (script runs, detects no new bills, exits cleanly)
- [ ] The cowork is documented in `/scripts/email-organizer/SETUP.md`

---

## A3 — Dashboard sync log page

**Type:** AFK · **Blocked by:** A1

### What to build

New `/dashboard/sync` page showing the result of the last sync run. The sync script writes a `data/sync-log.json` on each run; the page reads and displays it.

Page shows: last run timestamp, how many bills were added per category (energy, internet, community), any errors or skipped files, and a copyable shell command for manual runs.

### Acceptance criteria

- [ ] `sync_bills.py` writes `data/sync-log.json` at the end of each run with `{ran_at, added, skipped, errors}`
- [ ] `/dashboard/sync` renders the log behind auth
- [ ] Shows per-category counts: energy, internet, community
- [ ] Shows any error messages from the last run
- [ ] Sidebar link added to the dashboard navigation

---

## A4 — Extend sync to energy bills

**Type:** AFK · **Blocked by:** A1

### What to build

Energy bills (`soycliente@masmovilluzygas.es`, provider Más Móvil/Endesa) are currently commented out in `config.json` — the Drive folder ID is missing. Find the correct Drive folder, add parsing rules for the PDF format, and wire it into the existing sync pipeline.

### Acceptance criteria

- [ ] Energy bill Drive folder ID is identified and added to `config.json`
- [ ] `sync_bills.py` parses energy PDF fields: `month`, `total`, `potencia`, `consumo`, `iva`, `provider`
- [ ] Parsed data merges correctly into `data/bills.json` under the `energy` key
- [ ] At least 3 historical energy PDFs parse without errors
- [ ] Dashboard bills page shows energy data from the synced PDFs

---

## B1 — Master profile data file

**Type:** HITL · **Blocked by:** Nothing

### What to build

Create `data/profile.json` — a comprehensive master profile with everything Nico has done, unconstrained by CV page limits. This is the source of truth for all CV generation.

Schema mirrors the CV sections but with no space constraints: full achievement lists with metrics, all skills with context, all projects, certifications, education details, referrals with contact info.

Nico populates the content. The schema should be agreed before filling.

### Acceptance criteria

- [ ] `data/profile.json` schema is defined and documented
- [ ] Profile includes: `about` (3–5 variants of different lengths), `experience` (each role with 5+ achievement bullets), `skills` (grouped by category with proficiency), `education`, `languages`, `referrals`
- [ ] At least the 5 work entries from `CV 2026.pdf` are present with expanded bullet points
- [ ] File is committed to the repo
- [ ] Profile is not surfaced in the public portfolio (dashboard-only)

---

## B2 — Job URL analyzer

**Type:** AFK · **Blocked by:** Nothing

### What to build

`POST /api/cv/analyze-job` — fetches a job posting URL, extracts the page text, and calls the Claude API to return a structured `JobAnalysis` object. Works standalone, independent of the master profile.

`JobAnalysis` shape:
```ts
{
  url: string
  company: string
  role_title: string
  industry: string
  seniority: string
  required_skills: string[]
  nice_to_have: string[]
  keywords: string[]       // words that should appear in the CV
  company_tone: string     // e.g. "formal", "startup", "mission-driven"
  role_focus: string       // one-line summary of what they actually want
}
```

### Acceptance criteria

- [ ] `POST /api/cv/analyze-job` accepts `{ url: string }` and returns `JobAnalysis`
- [ ] Works with LinkedIn job posts, company careers pages, and Infojobs
- [ ] Returns a sensible result even for pages that block scrapers (graceful fallback using whatever text is available)
- [ ] Protected behind dashboard auth
- [ ] Tested against 3 real job URLs

---

## B3 — CV template (HTML → PDF export)

**Type:** AFK · **Blocked by:** B1

### What to build

Implement the `CV 2026.pdf` layout as a React component using `@react-pdf/renderer`. The two-column structure, typography, and section order must match the existing PDF exactly:

- Left column: Name/contact header, About, Education, "What I can bring" skills list, Languages, Referrals
- Right column: Career timeline (year range, company, role title, bullet points)

Accepts a `CvContent` object (subset of the master profile, tailored for a specific job) and renders a downloadable PDF.

### Acceptance criteria

- [ ] `CvContent` TypeScript type defined in `lib/types.ts`
- [ ] React component renders the two-column CV layout matching `CV 2026.pdf`
- [ ] PDF export produces a clean single-page (or paginated) PDF via `@react-pdf/renderer`
- [ ] `GET /api/cv/render/:id` streams the PDF for download
- [ ] Visually compared against `CV 2026.pdf` — fonts, spacing, column widths match

---

## B4 — CV generator API

**Type:** AFK · **Blocked by:** B1, B2, B3

### What to build

`POST /api/cv/generate` — takes a `JobAnalysis` + the master profile from `data/profile.json`, calls the Claude API to produce a tailored `CvContent`:

- Selects the 3–5 most relevant experience bullet points per role
- Rephrases bullets to mirror the job's language and keywords
- Reorders the "What I can bring" skills to front-load the most relevant
- Writes a tailored About paragraph (≤3 sentences) tuned to the role and company tone

Returns a `CvContent` ready for the template. Does not save anything — that's B5.

### Acceptance criteria

- [ ] `POST /api/cv/generate` accepts `{ job_analysis: JobAnalysis }` (profile loaded server-side)
- [ ] Generated CV uses keywords from `job_analysis.keywords` naturally in bullet points
- [ ] About paragraph is different for each job — not a generic copy of `profile.json`
- [ ] Response time under 15 seconds
- [ ] Protected behind dashboard auth

---

## B5 — CV version storage

**Type:** AFK · **Blocked by:** B4

### What to build

Persist each generated CV. On successful generation, save the `CvContent` to `data/cv-versions.json` and the rendered PDF to `/public/cvs/{id}.pdf`.

```ts
interface CvVersion {
  id: string
  job_url: string
  company: string
  role_title: string
  generated_at: string   // ISO 8601
  cv_content: CvContent
  pdf_path: string       // e.g. "/cvs/abc123.pdf"
}
```

Endpoints: `GET /api/cv/versions` (list), `GET /api/cv/versions/:id` (single).

### Acceptance criteria

- [ ] Generated CV is saved to `data/cv-versions.json` after successful generation
- [ ] PDF is saved to `/public/cvs/` with a stable filename based on the version ID
- [ ] `GET /api/cv/versions` returns list sorted by `generated_at` descending
- [ ] `GET /api/cv/versions/:id` returns the full `CvVersion` including `cv_content`
- [ ] Both endpoints protected behind dashboard auth

---

## B6 — Application tracker

**Type:** AFK · **Blocked by:** B5

### What to build

Track the outcome of each job application. Stored in `data/applications.json`.

```ts
interface Application {
  id: string
  cv_version_id: string
  applied_at: string
  status: "applied" | "interview_1" | "interview_2" | "offer" | "rejected" | "ghosted"
  notes: string
  salary_discussed: number | null
}
```

Simple computed stats: total applications, conversion rate per status step (applied → interview → offer).

Endpoints: `POST /api/cv/applications` (create), `PATCH /api/cv/applications/:id` (update status/notes).

### Acceptance criteria

- [ ] `POST /api/cv/applications` creates a new application linked to a `cv_version_id`
- [ ] `PATCH /api/cv/applications/:id` updates status and notes
- [ ] `GET /api/cv/stats` returns: total applied, interview rate, offer rate, ghosted count
- [ ] All endpoints protected behind dashboard auth

---

## B7 — CV generator + tracker dashboard UI

**Type:** AFK · **Blocked by:** B4, B5, B6

### What to build

Three dashboard pages behind auth:

**`/dashboard/cv`** — Generator
Paste a job URL → click Analyze → see `JobAnalysis` results → click Generate CV → preview the tailored CV in-page → Save + Download PDF. After saving, option to mark as "applied" immediately.

**`/dashboard/cv/versions`** — History
Table of all generated CVs: company, role, date, application status badge (or "not applied"). Click a row to re-download the PDF or update the application status.

**`/dashboard/cv/stats`** — Simple stats
Total CVs generated, total applications, conversion funnel (applied → interview_1 → interview_2 → offer), ghosted count. No charts needed — a clean stat card grid is enough.

### Acceptance criteria

- [ ] Generator page: URL input → analysis display → CV preview → save/download flow works end-to-end
- [ ] History page: lists all versions with status, sortable by date
- [ ] Status can be updated inline (dropdown) on the history page without a page reload
- [ ] Stats page shows the 5 key numbers from `GET /api/cv/stats`
- [ ] All pages added to the dashboard sidebar navigation
- [ ] All pages protected behind existing auth

---

*Generated by /to-issues — publish once PAT has `issues` write scope, or paste manually into GitHub.*
