"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Search, AlertCircle, CheckCircle2, Download, Bookmark } from "lucide-react";
import CvPreview from "@/app/components/cv/CvPreview";
import type { JobAnalysis, CvContent } from "@/lib/types";

const PHASES = [
  "Reading your profile…",
  "Matching experience to role…",
  "Drafting your CV…",
];

type AnalyzeState = "idle" | "loading" | "done" | "error";
type GenerateState = "idle" | "generating" | "done" | "error";

export default function GeneratorPage() {
  const [url, setUrl] = useState("");
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>("idle");
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");
  const [fallbackText, setFallbackText] = useState("");

  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [cvContent, setCvContent] = useState<CvContent | null>(null);
  const [generateError, setGenerateError] = useState("");

  const [phase, setPhase] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const phaseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setAnalyzeState("loading");
    setAnalyzeError("");
    setJobAnalysis(null);
    setGenerateState("idle");
    setCvContent(null);
    setSaved(false);

    try {
      const res = await fetch("/api/cv/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: JobAnalysis = await res.json();
      setJobAnalysis(data);
      setAnalyzeState("done");
    } catch {
      setAnalyzeError("Couldn't reach this URL — add the job description text manually below.");
      setAnalyzeState("error");
    }
  }

  async function handleGenerate() {
    if (!jobAnalysis) return;
    setGenerateState("generating");
    setGenerateError("");
    setCvContent(null);
    setSaved(false);
    setPhase(0);

    phaseRef.current = setInterval(() => {
      setPhase((p) => Math.min(p + 1, PHASES.length - 1));
    }, 4000);

    try {
      const res = await fetch("/api/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_analysis: jobAnalysis }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: CvContent = await res.json();
      setCvContent(data);
      setGenerateState("done");
    } catch {
      setGenerateError("Generation failed. Please try again.");
      setGenerateState("error");
    } finally {
      if (phaseRef.current) clearInterval(phaseRef.current);
    }
  }

  async function handleSave() {
    if (!cvContent || saving) return;
    setSaving(true);
    try {
      await fetch("/api/cv/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: cvContent, job_url: url }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!cvContent) return;
    const res = await fetch("/api/cv/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: cvContent }),
    });
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `cv-${cvContent.meta.target_company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(href);
  }

  useEffect(() => {
    return () => {
      if (phaseRef.current) clearInterval(phaseRef.current);
    };
  }, []);

  const hasAnalysis = analyzeState === "done" && jobAnalysis;

  return (
    <div className="flex h-screen min-w-[1024px]">
      {/* ── Left panel ── */}
      <div className="w-[360px] flex-shrink-0 border-r border-stone-200 bg-white overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h1 className="text-base font-semibold text-stone-900 mb-4">Generate CV</h1>

          {/* URL input */}
          <form onSubmit={handleAnalyze} className="mb-4">
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Job URL</label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://linkedin.com/jobs/view/..."
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 focus:bg-white transition pr-9"
              />
              {analyzeState === "loading" && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-stone-400" />
              )}
            </div>

            {analyzeError && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{analyzeError}</span>
              </div>
            )}

            {(analyzeState === "error") && (
              <textarea
                value={fallbackText}
                onChange={(e) => setFallbackText(e.target.value)}
                placeholder="Paste the job description text here…"
                rows={6}
                className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 placeholder-stone-400 outline-none focus:border-stone-400 resize-none"
              />
            )}

            <button
              type="submit"
              disabled={analyzeState === "loading" || !url.trim()}
              className="mt-2 w-full rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-40 transition"
            >
              {analyzeState === "loading" ? "Analyzing…" : "Analyze"}
            </button>
          </form>

          {/* Job analysis card */}
          {hasAnalysis && (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-stone-900">{jobAnalysis.company}</p>
                <span className="text-[10px] text-stone-500 capitalize">{jobAnalysis.seniority}</span>
              </div>
              <p className="text-xs text-stone-700">{jobAnalysis.role_title}</p>
              <p className="text-[10px] text-stone-500 italic">{jobAnalysis.role_focus}</p>

              <div className="pt-1 border-t border-stone-200 space-y-1.5">
                {[
                  { label: "Industry", value: jobAnalysis.industry },
                  { label: "Tone", value: jobAnalysis.company_tone },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2 text-[10px]">
                    <span className="text-stone-500 w-14 flex-shrink-0">{label}</span>
                    <span className="text-stone-700">{value}</span>
                  </div>
                ))}
              </div>

              {/* Keywords chips */}
              <div className="pt-1 border-t border-stone-200">
                <p className="text-[10px] text-stone-500 mb-1">Keywords</p>
                <div className="flex flex-wrap gap-1">
                  {jobAnalysis.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded bg-[#0f172a]/8 px-1.5 py-0.5 text-[9px] text-[#0f172a] font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generate button */}
          {hasAnalysis && (
            <button
              onClick={handleGenerate}
              disabled={generateState === "generating"}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40 transition flex items-center justify-center gap-2"
            >
              {generateState === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                "Generate CV"
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-y-auto bg-stone-50">
        {generateState === "idle" && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-xs">
              <p className="text-stone-400 text-sm">
                Paste a job URL on the left to generate your tailored CV →
              </p>
            </div>
          </div>
        )}

        {generateState === "generating" && (
          <div className="flex h-full items-center justify-center">
            <div className="w-72">
              <p className="text-sm font-medium text-stone-700 mb-4 text-center">
                {PHASES[phase]}
              </p>
              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full bg-[#0f172a] rounded-full transition-all duration-1000"
                  style={{ width: `${((phase + 1) / PHASES.length) * 85}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                {PHASES.map((p, i) => (
                  <span
                    key={i}
                    className={`text-[10px] ${
                      i <= phase ? "text-stone-700" : "text-stone-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {generateState === "error" && (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-5 text-center max-w-sm">
              <p className="text-sm text-red-700 mb-3">{generateError}</p>
              <button
                onClick={handleGenerate}
                className="text-sm font-medium text-red-700 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {generateState === "done" && cvContent && (
          <div className="flex flex-col items-center py-8 px-6">
            {/* Action buttons */}
            <div className="flex gap-3 mb-6 w-full max-w-[595px]">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 transition"
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" />
                    {saving ? "Saving…" : "Save"}
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] transition"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>

            {/* CV paper card */}
            <div className="overflow-x-auto">
              <CvPreview content={cvContent} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
