/**
 * Test script: JD URL scraping + PDF parsing
 *
 * Run with:  node scripts/test-jd-fetch.mjs
 *
 * Tests the fetchPageText logic against real job boards and reports
 * whether each URL returns usable content for Claude to analyze.
 * No auth cookie needed — it calls the helper directly, not via HTTP.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { PDFParse } from "pdf-parse";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");

// ── Inline the fetchPageText logic so we don't need the Next.js server running ──

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchPageText(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      return { text: null, status: res.status, reason: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 25_000);

    if (text.length < 200) {
      return { text: null, status: res.status, reason: "Blocked / minimal content (<200 chars)" };
    }

    return { text, status: res.status, reason: "OK" };
  } catch (err) {
    return { text: null, status: null, reason: err.message };
  }
}

// ── Test URLs — a mix of job boards, some open, some gated ──

const TEST_URLS = [
  // Greenhouse — server-rendered, reliably open
  {
    label: "Greenhouse (Anthropic board)",
    url: "https://boards.greenhouse.io/anthropic",
    expectPass: true,
  },
  // Lever — server-rendered, reliably open
  {
    label: "Lever (Vercel)",
    url: "https://jobs.lever.co/vercel",
    expectPass: true,
  },
  // Ashby — modern, server-rendered
  {
    label: "Ashby (Linear)",
    url: "https://jobs.ashbyhq.com/linear",
    expectPass: true,
  },
  // Workable — JS-rendered, usually blocked
  {
    label: "Workable (JS-rendered — may block)",
    url: "https://apply.workable.com/mottum",
    expectPass: false,
  },
  // LinkedIn — gated, individual jobs require login
  {
    label: "LinkedIn jobs (gated — expect block or generic)",
    url: "https://www.linkedin.com/jobs/search/?keywords=product+manager",
    expectPass: false,
  },
  // Indeed — 403 for scrapers
  {
    label: "Indeed (blocked — expect 403)",
    url: "https://www.indeed.com/jobs?q=software+engineer&l=remote",
    expectPass: false,
  },
  // Remote.co — usually open
  {
    label: "Remote.co (usually open)",
    url: "https://remote.co/remote-jobs/",
    expectPass: true,
  },
  // Plain text HTML as control
  {
    label: "Plain HTML control (example.com)",
    url: "https://example.com",
    expectPass: false,
  },
];

// ── PDF test ──

async function testPdfParsing() {
  const pdfPath = join(ROOT, "public", "cvs");
  const pdfFiles = existsSync(pdfPath)
    ? readdirSyncSafe(pdfPath).filter((f) => f.endsWith(".pdf"))
    : [];

  if (pdfFiles.length === 0) {
    return { skipped: true, reason: "No PDF in public/cvs/ — generate a CV first to test" };
  }

  const target = join(pdfPath, pdfFiles[0]);
  try {
    const buffer = readFileSync(target);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return {
      file: pdfFiles[0],
      chars: result.text.length,
      pages: result.total,
      sample: result.text.slice(0, 200).replace(/\s+/g, " ").trim(),
    };
  } catch (err) {
    return { error: err.message };
  }
}

function readdirSyncSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

// ── Runner ──

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function grade(text) {
  if (!text) return null;
  if (text.length > 5_000) return "excellent";
  if (text.length > 1_000) return "good";
  if (text.length > 200) return "minimal";
  return "too-short";
}

console.log("\n=== JD URL Scraping Tests ===\n");

const results = [];
for (const { label, url, expectPass } of TEST_URLS) {
  process.stdout.write(`  ${DIM}${label}${RESET}… `);
  const t0 = Date.now();
  const result = await fetchPageText(url);
  const ms = Date.now() - t0;
  const g = grade(result.text);
  const gotContent = g === "excellent" || g === "good";

  const status =
    g === "excellent"
      ? `${GREEN}✓ EXCELLENT${RESET}`
      : g === "good"
      ? `${GREEN}✓ GOOD${RESET}`
      : g === "minimal"
      ? `${YELLOW}⚠ MINIMAL${RESET}`
      : `${RED}✗ BLOCKED${RESET}`;

  const surprise =
    expectPass && !gotContent
      ? ` ${YELLOW}[unexpected — try paste/PDF fallback]${RESET}`
      : !expectPass && gotContent
      ? ` ${GREEN}[bonus — scraping works!]${RESET}`
      : "";

  console.log(
    `${status}  ${result.reason}  ${DIM}(${ms}ms, ${result.text?.length ?? 0} chars)${RESET}${surprise}`
  );

  if (result.text) {
    console.log(`     ${DIM}Preview: ${result.text.slice(0, 120).replace(/\s+/g, " ")}…${RESET}`);
  }

  results.push({ label, grade: g, chars: result.text?.length ?? 0, ms, expectPass });
}

const passing = results.filter((r) => r.grade === "excellent" || r.grade === "good").length;
const expectedPassing = results.filter((r) => r.expectPass).length;
console.log(`\nURL scraping: ${passing}/${TEST_URLS.length} URLs returned usable content (${expectedPassing} expected to pass)\n`);

// PDF test
console.log("=== PDF Parsing Test ===\n");
const pdfResult = await testPdfParsing();
if (pdfResult.skipped) {
  console.log(`  ${YELLOW}⚠ SKIPPED${RESET}  ${pdfResult.reason}`);
} else if (pdfResult.error) {
  console.log(`  ${RED}✗ ERROR${RESET}  ${pdfResult.error}`);
} else {
  console.log(`  ${GREEN}✓ PASS${RESET}  ${pdfResult.file} — ${pdfResult.pages} pages, ${pdfResult.chars} chars`);
  console.log(`  ${DIM}Sample: ${pdfResult.sample}…${RESET}`);
}

console.log("\n=== Done ===\n");
