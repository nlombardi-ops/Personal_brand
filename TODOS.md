# TODOS

Branding improvement roadmap. Ordered by impact. Each item is self-contained.

---

## TIER 1 — High impact, do first

### 1. Create og:image for social sharing
**What:** A 1200×630px branded PNG at `/public/og-image.png`.
**Why:** Every link share on LinkedIn, Slack, or WhatsApp shows a blank card right now. The metadata is already wired in `layout.tsx` — just needs the image file.
**How:** Dark navy background (`#0f172a`), "Nico Lombardi" in white at ~72px, "Business Development · Fintech · AI · Operations" below in neutral-400 at ~24px. Drop at `/public/og-image.png`.
**Effort:** 30 min in Figma/Canva.

### 2. Custom favicon
**What:** Replace the default Next.js icon with an NL monogram in the browser tab.
**Why:** Every tab, every bookmark. Currently reads as an unfinished site.
**How:** SVG or 32×32 PNG with "NL" lettermark. Place at `app/favicon.ico`.
**Effort:** 10–15 min.

### 3. Hero — add a professional photo
**What:** A headshot positioned to the right of the text block in the hero.
**Why:** BD and consulting is a relationship business. Visitors want to put a face to the name before they reach out.
**How:** Add `<Image>` (Next.js) to the hero. Shift layout to `lg:grid-cols-2` — text left, photo right. Hide photo on mobile.
**Effort:** 1–2 hrs.

### 4. Populate "Selected Work" with real, distinct projects
**What:** The section currently duplicates Work entries. Replace with 2–3 genuinely distinct items.
**Why:** A Projects section that copies Work is worse than no section. Real distinct projects signal range and initiative.
**Ideas:** The personal finance dashboard built for this site, BD playbooks or tools, published writing, notable partnerships where you were the lead.
**How:** Edit `app/components/Projects.tsx`.
**Effort:** Content gathering + 30 min to wire up.

---

## TIER 2 — Polish and differentiation

### 5. Hero — stronger personal voice in the tagline
**What:** Replace the clinical "10+ years driving growth…" with a line that has a specific point of view.
**Why:** The first paragraph is the highest-read text on the page. One opinionated line differentiates you from every other "10+ years in fintech" bio.
**Options to try:**
- "I've helped companies close their first enterprise deal, enter new markets, and build AI products that actually ship."
- "I work at the intersection of strategy and execution — I can build the pitch deck and run the partnership call."
- "Founder of Mottum Analytica. Previously Uber Direct, Polestar, Capgemini. Based in Madrid, working across Europe."
**How:** Edit the `<p>` in `app/components/Hero.tsx`.
**Effort:** Copywriting — 1 hr of drafting + your own voice.

### 6. References — collect the two pending quotes
**What:** Two reference slots are "Coming soon." Fill them.
**Why:** Social proof is one of the strongest conversion signals. Two live references are good; four would be better.
**How:** Reach out to contacts at Uber Direct and a Mottum client. Draft a 2–3 sentence quote for them to approve or edit. Once you have the text, update `app/components/References.tsx`.
**Effort:** Outreach + editing. No code until you have the text.

### 7. Dark mode support
**What:** A `prefers-color-scheme: dark` CSS variant.
**Why:** A significant portion of users run dark mode. The site is currently light-only.
**How:** Extend `:root` in `globals.css` with a `@media (prefers-color-scheme: dark)` block. The CSS variable system (`--background`, `--foreground`, `--cta-accent`) makes this relatively clean. Main challenge: the dot-grid hero texture needs a dark variant.
**Effort:** 2–3 hrs.

---

## TIER 3 — Long-term quality

### 8. PDF CV / download option
**What:** A downloadable PDF of the CV, linked from the Contact section.
**Why:** Some recruiters and clients prefer a PDF. Avoids the "can you send your CV?" follow-up.
**How:** Design the PDF, host at `/public/nico-lombardi-cv.pdf`, add a small download link in `Contact.tsx`.
**Effort:** 1–2 hrs for the PDF design.

### 9. Multilingual — Spanish version
**What:** A Spanish version of the site or a language toggle.
**Why:** Based in Madrid, working the Iberian market. A Spanish version signals local commitment.
**How:** Next.js i18n routing. Extract all strings to locale files. Easier to do now than to retrofit later.
**Effort:** 3–5 hrs if done now; much more if deferred.

---

---

## TIER 1 — Dashboard (from design review)

### 10. Finance dashboard — light theme redesign
**What:** Replace the dark `neutral-950` dashboard with a warm stone palette (`stone-50` bg, `stone-100` sidebar, white cards). See ISSUES.md "Dashboard redesign" issue for full color spec.
**Why:** Dark theme made sense as a scaffold. A personal finance tool should feel approachable. The stone palette is already used in the CV tool — one consistent authenticated-area visual language.
**How:** Update 7 components: DashboardShell, Sidebar, StatCard, BillsTable, CostChart, StackedBarChart, AmortizationChart. Check all recharts stroke colors for readability on light bg.
**Effort:** 2–3 hrs.
**Update (2026-08-03):** the shell/nav (DashboardShell, Sidebar, StatCard) are already migrated to `stone-*`, but `app/dashboard/bills/page.tsx` still has leftover dark-theme fragments this list didn't originally call out: the `<h1>` is `text-white` (invisible on the now-light `bg-stone-50` shell) and the "Energy Bill Detail" table sits in a `bg-neutral-900` card. Not in the original 7-component list — add `BillsPage` itself as an 8th target when this is picked up.

### 11. Dashboard — prompt toolkit as "default assistants"
**What:** New `/dashboard/assistants` page with 3 chat-based assistants — Career & Life Design (Tim Ferriss style), LinkedIn Optimization, Focus/Anti-Paralysis (ADHD) — built from the 14-prompt toolkit captured from Instagram (@codingknowledge, @real_bruno_souza, @airesearches). Source prompts live in `docs/toolkit-prompts-source/` (00-README + 3 collection files). Each assistant exposes a mode selector for its underlying prompts (e.g. LinkedIn's 5 prompts: headline, about, referral message, keywords, experience); the Career assistant's 4 prompts are meant to run in sequence (skill stack → leverage gaps → career-path reality check → 10-year wealth strategy).
**Why:** These prompts were being copy-pasted manually from saved Instagram posts. Turning them into always-available, pre-contextualized assistants removes the friction of re-explaining who you are (Mottum Analytica founder, career history) every time you want to run one.
**How:**
- `data/assistants.json` (same pattern as `data/contracts.json`): `{ assistants: [{ id, name, source, sequential, modes: [{ id, label, system_prompt, note }] }] }`, one entry per collection. System prompts derived from the source `.md` files with the hardcoded "Mi contexto" block and "paste your CV" instructions stripped out — those get injected dynamically instead (see below).
- `app/api/dashboard/assistants-chat/route.ts` (same pattern as `app/api/dashboard/contracts-chat/route.ts`): receives `{ assistant_id, mode_id, messages }`, builds the system prompt from the selected mode + a "Mi contexto" block generated live from `getProfile()` (`lib/cv/profile-store.ts`) — the same profile that feeds the CV builder, so updating your CV keeps the assistants current automatically. LinkedIn prompts that need your downloaded LinkedIn export still require pasting it in-chat — that data isn't stored anywhere in the repo.
- `AssistantChat` component (reuse `ContractsChat.tsx`'s chat-bubble/input pattern), with a mode-select control at the top. One conversation thread per assistant — switching modes within the same assistant swaps the active system prompt but keeps the message history, so the Career assistant's 4 acts can build on each other.
- New nav entry in `Sidebar.tsx`, behind the existing `AuthGuard`/`dashboard_auth` cookie — private, not public-facing.
**Effort:** ~2–3 hrs (data authoring from the 3 source files + API route + component + nav entry).
**Update (2026-08-13):** superseded in scope by item 13 below — explored in a `/gsd-explore` session and the ambition grew from "3 chat assistants" to a full personal-goals hub. Item 13 absorbs the Career & Life Design collection's use case (periodic coach-style check-in); LinkedIn Optimization and Focus/ADHD collections still stand as originally scoped here unless item 13's shape ends up covering them too.

### 11a. DESIGN.md missing dashboard section
**What:** `DESIGN.md` only documents the marketing/portfolio site's `neutral-*`/Geist system. The dashboard runs a separate, undocumented system (`stone-*` palette, `emerald-600` accent, `rounded-xl border-stone-200 bg-white` cards) visible in `Sidebar.tsx`/`StatCard.tsx`.
**Why:** Discovered while planning item 11 (dashboard assistants) — had to reverse-engineer the dashboard's visual conventions from code instead of a doc. Future dashboard work hits the same problem.
**How:** Add a "Dashboard" section to `DESIGN.md` mirroring the existing format (palette table, card/nav patterns) once item 10's light-theme redesign is finalized — no point documenting it mid-migration.
**Depends on:** item 10 (finish the redesign first, then document the settled result).
**Effort:** ~30 min once item 10 is done.

### 11b. Dashboard has no responsive/mobile support
**What:** `DashboardShell`/`Sidebar` have zero breakpoints — fixed `ml-60` margin, no hamburger nav, no stacked mobile layout. The marketing site already has mobile nav (see "Done" list below); the dashboard never got the same treatment.
**Why:** Discovered while planning item 11 (dashboard assistants) — any new dashboard page inherits this gap, not just the assistants page.
**How:** Collapsible/hamburger sidebar below `md:`, matching the pattern already built for the marketing nav.
**Effort:** Unscoped — needs its own pass across all dashboard pages, not a quick fix.

### 12. CV tool — standalone /cv shell
**What:** New `app/cv/` route with its own layout shell, sidebar, and four pages: Generator, My Profile, History, Stats. See ISSUES.md B7 for full spec.
**Why:** CV generation is a separate product from the finance dashboard. Mixing them in the same sidebar is tonally wrong.
**Effort:** See ISSUES.md B4 + B5 + B6 + B7 dependency chain.

### 13. Personal goals hub — one-page summary of objectives + tracked progress
**What:** A new, bigger tab (supersedes item 11's narrower "3 chat assistants" framing) that's a one-page summary of self-improvement goals across life areas — e.g. communication, savings, learning a new subject, career trajectory — each with progress recorded and updated over time. Also intended to "map all the data I have about me" in one place, pulling together what's currently scattered across `/cv/profile` (`context_enrichment`, `docs/voice-profile.md`) and `/dashboard` (mortgage/bills/insurance).
**Why:** Came out of a `/gsd-explore` session (2026-08-13) that started as "let me re-run the Tim Ferriss career-audit prompt (`docs/toolkit-prompts-source/01-carrera-y-diseno-de-vida.md`) periodically" and grew into wanting a real coaching-style check-in mechanism — run it every so often, see how the answers change over time — plus a single hub that shows "where am I now" across every area, not just career.
**How (sketch, not yet planned):**
- The career-audit prompt (and possibly others) becomes a periodic check-in — each run appends a dated snapshot, similar in spirit to `profile.context_enrichment` / `data/voice-samples.json`'s append-only pattern.
- "Data-backed" goals (e.g. savings) pull live from existing dashboard data (`data/mortgage.json`, `data/bills.json`) instead of requiring manual updates.
- "Qualitative" goals (communication, new skill) update from the periodic check-ins' output.
- Areas are likely user-defined/extensible, not a fixed enum — needs confirming.
**Open question — not resolved yet:** exactly how progress gets updated per goal (manual entry vs. auto-derived from check-ins vs. pulled from existing data) — likely a mix, but the split needs a follow-up `/gsd-explore` session before planning.
**Effort:** Unscoped — this is exploration-stage, needs another discovery pass (and probably a proper `/gsd-new-project`- or `/gsd-spec-phase`-style treatment given the scope) before estimating.

---

## Done (reference)

- ✅ Dashboard removed from primary nav → moved to footer
- ✅ Mobile hamburger/drawer nav
- ✅ Section order: Hero → Services → Work → Selected Work → References → Contact
- ✅ Services: 2×2 grid → numbered editorial list
- ✅ Hero CTAs swapped: Get in touch = primary (filled), See my work = secondary
- ✅ Hero dot-grid background texture
- ✅ Contrast: neutral-400 labels/dates → neutral-600 (WCAG AA)
- ✅ Tag chips standardised to px-2 py-0.5
- ✅ References empty state fallback + pending entry names fixed
- ✅ OG/Twitter metadata wired in layout.tsx
- ✅ DESIGN.md created
- ✅ Nav scroll active state (IntersectionObserver)
- ✅ Scroll entrance animations (Framer Motion, FadeUp)
- ✅ Work case study highlights: Polestar + Uber Direct
- ✅ Vercel Analytics added
- ✅ Font fallback: "Helvetica Neue", Arial, sans-serif
