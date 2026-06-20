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

### 11. CV tool — standalone /cv shell
**What:** New `app/cv/` route with its own layout shell, sidebar, and four pages: Generator, My Profile, History, Stats. See ISSUES.md B7 for full spec.
**Why:** CV generation is a separate product from the finance dashboard. Mixing them in the same sidebar is tonally wrong.
**Effort:** See ISSUES.md B4 + B5 + B6 + B7 dependency chain.

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
