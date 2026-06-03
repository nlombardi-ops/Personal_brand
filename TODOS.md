# TODOS

---

## Branding Improvement Plan

This is the full roadmap for taking the personal brand site from its current state to a polished, high-trust professional portfolio. Ordered by impact. Each item is self-contained — you can pick them up in any order.

---

### TIER 1 — High impact, do first

#### 1. Create og:image for social sharing
**What:** A 1200×630px branded PNG at `/public/og-image.png`.
**Why:** Every link share on LinkedIn, Slack, or WhatsApp shows a blank card right now. This is the first impression for most inbound contacts. The metadata is already wired in `layout.tsx` — just needs the image file.
**How:** Dark navy background (`#0f172a`), "Nico Lombardi" in white at ~72px, "Business Development · Fintech · AI · Operations" in neutral-400 at ~24px, possibly a subtle dot grid texture matching the hero. Export as PNG 1200×630. Drop in `/public/og-image.png`.
**Effort:** 30 min in Figma/Canva or generate with a script.

#### 2. Custom favicon
**What:** Replace the default Next.js icon with an NL monogram in the browser tab.
**Why:** Every tab, every bookmark shows this. Currently reads as "unfinished site" to anyone who notices.
**How:** SVG with "NL" in Geist-style font, or a simple geometric lettermark. Place at `app/favicon.ico` (Next.js app router) or generate the full `icon.png` / `apple-icon.png` set.
**Effort:** 10–15 min.

#### 3. Hero — add a professional photo
**What:** A headshot or professional portrait positioned right of the text block in the hero.
**Why:** BD and consulting is a relationship business. Visitors want to put a face to the name before they reach out. The dot-grid texture added in the review is good but not a replacement for a face.
**How:** Add an `<Image>` component (Next.js) to the right half of the hero grid on desktop, hidden on mobile. Use a high-quality square or portrait crop. The grid layout would shift to `lg:grid-cols-2` with text left, image right.
**Effort:** 1–2 hrs (layout adjustment + image optimisation).

#### 4. Populate "Selected Work" with real, distinct projects
**What:** The section currently duplicates Work entries. Replace with 2–3 genuinely distinct items — tools built, initiatives led, content published, or notable achievements outside your job timeline.
**Why:** A Projects section that's a copy of Work is worse than no section. It erodes trust. Real distinct projects signal range and initiative.
**How:** Edit `app/components/Projects.tsx`. Ideas: the personal finance dashboard built for this site (it's a real product), any BD tools or playbooks you've built, published writing, or notable partnerships where you were the lead.
**Effort:** Content gathering + 30 min to wire up.

---

### TIER 2 — Polish and differentiation

#### 5. Hero — stronger personal voice in the tagline
**What:** The current tagline is factual but clinical: "10+ years driving growth at the intersection of fintech, AI and operations." True, but every BD consultant says something like this.
**Why:** The first paragraph is the highest-read text on the page. One line with a specific point of view differentiates you from every other "10+ years in fintech" bio.
**How:** Write 2–3 variants. Options to explore:
- Lead with a result: "I've helped companies close their first enterprise deal, enter new markets, and build AI products that actually ship."
- Lead with a method: "I work at the intersection of strategy and execution — I can build the pitch deck and run the partnership call."
- Lead with a specific: "Founder of Mottum Analytica. Previously Uber Direct, Polestar, Capgemini. Based in Madrid, working with clients across Europe."
**Effort:** Copywriting — 1 hr of drafting + your own voice.

#### 6. Nav scroll active state
**What:** Highlight the active nav link as the user scrolls between sections.
**Why:** On a long single-page scroll, users lose their place. The nav should tell them where they are.
**How:** `IntersectionObserver` on each section. When a section is ≥50% in view, apply `text-neutral-900` to its nav link. Works with the existing mobile drawer too.
**Effort:** ~1 hr of JS.
**File:** `app/components/Nav.tsx`

#### 7. Scroll entrance animations
**What:** Sections fade or translate up as they enter the viewport.
**Why:** The site is completely static — no motion signals a 2020 site in 2026. Even subtle entrance animations make the page feel alive and crafted.
**How:** Use Framer Motion (`framer-motion` package) or CSS `@keyframes` + `IntersectionObserver`. Recommended: 300ms fade-up on each section, staggered by 50ms for child items in Work and Services. Keep it subtle — the goal is "noticed subconsciously" not "wow look at that animation."
**Effort:** 2–3 hrs with Framer Motion.

#### 8. References — add real pending references
**What:** Two reference slots are currently "Coming soon." Fill them.
**Why:** Social proof is one of the strongest conversion signals on a personal brand page. Two live references are good; four would be better. One from a client (Mottum), one from Uber Direct would round out the credibility across different contexts (founder, operator).
**How:** Reach out to contacts at Uber Direct and a Mottum client. Provide them with a draft quote to approve or edit. Short (2–3 sentences), specific, results-focused.
**Effort:** Outreach + editing. No code needed until you have the text.

#### 9. Case study depth on one Work entry
**What:** Expand one Work timeline entry into a brief inline case study — 2–3 bullet points of specific results rather than a single description paragraph.
**Why:** "15% revenue growth" buried in a paragraph is weaker than "Led B2B telematics launch → 15% revenue growth in 12 months, 3 new fleet partnerships." Specific numbers at a glance are more persuasive.
**How:** Pick the 1–2 entries with the strongest quantitative results (Polestar, Uber Direct). Add a `highlights` array to the work data and render as small bullet points under the description.
**Effort:** 30 min of content + 1 hr of code.

---

### TIER 3 — Long-term quality

#### 10. Dark mode support
**What:** A `prefers-color-scheme: dark` variant.
**Why:** A significant percentage of users run dark mode. The current site is light-only.
**How:** Extend `:root` in `globals.css` with dark variants. The CSS variable system already set up (`--background`, `--foreground`, `--cta-accent`) makes this relatively straightforward. Key challenge: the dot-grid hero texture needs a dark version.
**Effort:** 2–3 hrs.

#### 11. Analytics
**What:** Add lightweight analytics to understand where traffic comes from and which sections get engagement.
**Why:** You can't improve what you can't measure. As you share the site on LinkedIn and with contacts, knowing which content resonates shapes what to expand.
**How:** Plausible Analytics (privacy-friendly, no cookie banner needed) or Vercel Analytics (already in the stack if deployed on Vercel). Add the script tag to `layout.tsx`.
**Effort:** 15 min setup.

#### 12. PDF CV / download option
**What:** A downloadable PDF version of the CV accessible from the Contact section or nav.
**Why:** Some recruiters and clients prefer a PDF. Having one linked avoids the "can you send your CV?" follow-up.
**How:** Create a well-formatted PDF of the site content. Host in `/public/nico-lombardi-cv.pdf`. Add a small download link in the Contact section.
**Effort:** 1–2 hrs for the PDF design.

#### 13. Multilingual consideration (Spanish)
**What:** A Spanish version of the site, or at minimum a language toggle.
**Why:** You're based in Madrid and work across the Iberian market. A Spanish version signals local commitment to Spanish-speaking prospects.
**How:** Next.js i18n routing supports this natively. Extract all strings to a locale file. Low implementation effort if planned from the start; harder to retrofit.
**Effort:** 3–5 hrs if planned now. Much more if retrofitted later.

---

## Design (from review)

### Fix font fallback (minor)
**What:** The body font stack currently uses `ui-sans-serif` as fallback. For completeness specify `'Helvetica Neue', Arial, sans-serif`.
**Why:** Extremely minor — Geist is loaded via `next/font` which is highly reliable. Only matters if the font CDN is unavailable.

### Create custom favicon
**What:** Replace the default Next.js favicon with a custom NL monogram.
**Why:** The browser tab currently shows the Next.js default icon. For a personal brand, the tab should show your initials. Consistent with the NL nav logo.
**Pros:** Completes the brand in one of the most visible persistent UI elements.
**Cons:** Small task, no real downside.
**How:** Create a 32×32 SVG or PNG with "NL" or a lettermark. Place in `/public/favicon.ico` (or use `app/favicon.ico` for Next.js app router). 10-minute task.

### Create og:image
**What:** Create the actual `/public/og-image.png` (1200×630px) — the metadata is already wired up in `layout.tsx`.
**Why:** LinkedIn, Twitter, and Slack previews will show a blank card until this image exists. For a BD professional sharing your own site, the first LinkedIn impression matters.
**Pros:** Fully branded link previews on all social platforms.
**Cons:** Requires design work for the image itself.
**How:** Create a 1200×630 PNG. Suggested content: dark background (#0f172a), "Nico Lombardi" in large Geist-style sans-serif, "Business Development · Fintech · AI · Operations" in smaller text, white on dark. Place at `/public/og-image.png`.

### Populate "Selected Work" section with real projects
**What:** The "Selected Work" section currently has Mottum Analytica and the UN partnership — both already mentioned in Work. Add 1–2 genuinely distinct entries.
**Why:** "Selected Work" should contain projects that go beyond job roles — tools built, initiatives led, side projects, or notable achievements that don't fit the timeline format.
**How:** Think about: any internal tools or dashboards built, published content, open source contributions, or discrete projects from your career. Add as new entries in `Projects.tsx`.

### Nav scroll active state
**What:** Highlight the current section in the nav as the user scrolls (e.g. "Work" is underlined when the Work section is in view).
**Why:** Improves wayfinding on a long single-page scroll. Users know where they are.
**How:** Use `IntersectionObserver` to track which section is in view, apply `text-neutral-900` (instead of `neutral-500`) to the corresponding nav link.
**Depends on:** Mobile nav drawer (already done).

### Fix font fallback (minor)
**What:** The body font stack currently uses `ui-sans-serif` as fallback. This is already improved from `system-ui`, but for completeness you could specify a named fallback like `'Helvetica Neue', Arial, sans-serif`.
**Why:** Extremely minor — Geist is loaded via `next/font` which is highly reliable. Only matters if the font CDN is unavailable.
