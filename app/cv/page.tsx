"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  Bookmark,
  FileText,
  Link,
  X,
} from "lucide-react";
import CvPreview from "@/app/components/cv/CvPreview";
import type { JobAnalysis, CvContent, AngleAnalysis } from "@/lib/types";

const PHASES = [
  "Reading your profile…",
  "Matching experience to role…",
  "Drafting your CV…",
];

type InputMode = "url" | "text";
type AnalyzeState = "idle" | "loading" | "done" | "error";
type GenerateState = "idle" | "generating" | "done" | "error";

export default function GeneratorPage() {
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>("idle");
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");

  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [cvContent, setCvContent] = useState<CvContent | null>(null);
  const [angleAnalysis, setAngleAnalysis] = useState<AngleAnalysis | null>(null);
  const [generateError, setGenerateError] = useState("");

  const [phase, setPhase] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const phaseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handlePdfUpload(file: File) {
    setPdfError("");
    setPdfLoading(true);
    setPdfName(file.name);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/cv/parse-pdf", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        setPdfError(err.error ?? "Upload failed");
        setPdfName("");
        return;
      }
      const { text } = await res.json();
      setPastedText(text);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();

    const usingUrl = inputMode === "url" && url.trim();
    const usingText = pastedText.trim().length > 50;

    if (!usingUrl && !usingText) return;

    setAnalyzeState("loading");
    setAnalyzeError("");
    setJobAnalysis(null);
    setGenerateState("idle");
    setCvContent(null);
    setSaved(false);

    try {
      const body: Record<string, string> = {};
      if (usingUrl) body.url = url.trim();
      if (usingText) body.text = pastedText.trim();

      const res = await fetch("/api/cv/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: JobAnalysis = await res.json();
      setJobAnalysis(data);
      setAnalyzeState("done");
    } catch {
      setAnalyzeError("Analysis failed — check the URL or paste the JD text.");
      setAnalyzeState("error");
    }
  }

  async function handleGenerate() {
    if (!jobAnalysis) return;
    setGenerateState("generating");
    setGenerateError("");
    setCvContent(null);
    setAngleAnalysis(null);
    setSaved(false);
    setPhase(0);

    phaseRef.current = setInterval(() => {
      setPhase((p) => Math.min(p + 1, PHASES.length - 1));
    }, 4000);

    try {
      const [cvRes, angleRes] = await Promise.all([
        fetch("/api/cv/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_analysis: jobAnalysis }),
        }),
        fetch("/api/cv/angle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_analysis: jobAnalysis }),
        }),
      ]);

      if (!cvRes.ok) throw new Error(await cvRes.text());
      const cvData: CvContent = await cvRes.json();
      setCvContent(cvData);

      if (angleRes.ok) {
        const angleData: AngleAnalysis = await angleRes.json();
        setAngleAnalysis(angleData);
      }

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
  const canAnalyze =
    (inputMode === "url" && url.trim().length > 0) ||
    pastedText.trim().length > 50;

  return (
    <div className="flex h-screen min-w-[1024px]">
      {/* ── Left panel ── */}
      <div className="w-[360px] flex-shrink-0 border-r border-stone-200 bg-white overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h1 className="text-base font-semibold text-stone-900 mb-4">Generate CV</h1>

          {/* Input mode tabs */}
          <div className="flex rounded-lg border border-stone-200 overflow-hidden mb-4 text-xs font-medium">
            <button
              onClick={() => setInputMode("url")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition ${
                inputMode === "url"
                  ? "bg-[#0f172a] text-white"
                  : "bg-white text-stone-500 hover:bg-stone-50"
              }`}
            >
              <Link className="h-3 w-3" />
              URL
            </button>
            <button
              onClick={() => setInputMode("text")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition ${
                inputMode === "text"
                  ? "bg-[#0f172a] text-white"
                  : "bg-white text-stone-500 hover:bg-stone-50"
              }`}
            >
              <FileText className="h-3 w-3" />
              Paste / PDF
            </button>
          </div>

          <form onSubmit={handleAnalyze} className="mb-4">
            {inputMode === "url" ? (
              <>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Job URL</label>
                <div className="relative">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://linkedin.com/jobs/view/..."
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 focus:bg-white transition"
                  />
                  {analyzeState === "loading" && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-stone-400" />
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-stone-400">
                  Blocked by the site? Switch to Paste / PDF.
                </p>
              </>
            ) : (
              <>
                {/* PDF upload */}
                <div className="mb-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePdfUpload(f);
                    }}
                  />
                  {pdfName ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate flex-1">{pdfName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setPdfName("");
                          setPastedText("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={pdfLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-3 text-xs text-stone-500 hover:border-stone-400 hover:bg-white transition disabled:opacity-50"
                    >
                      {pdfLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      {pdfLoading ? "Reading PDF…" : "Upload job description PDF"}
                    </button>
                  )}
                  {pdfError && (
                    <p className="mt-1 text-[10px] text-red-600">{pdfError}</p>
                  )}
                </div>

                {/* Paste textarea */}
                <label className="block text-xs font-medium text-stone-600 mb-1.5">
                  {pdfName ? "Extracted text (editable)" : "Paste job description"}
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste the full job description here…"
                  rows={10}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 placeholder-stone-400 outline-none focus:border-stone-400 resize-none"
                />
                <p className="mt-1 text-[10px] text-stone-400">
                  {pastedText.trim().length} chars
                  {pastedText.trim().length > 0 && pastedText.trim().length < 50
                    ? " — paste at least 50 characters"
                    : ""}
                </p>
              </>
            )}

            {analyzeError && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>{analyzeError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={analyzeState === "loading" || !canAnalyze}
              className="mt-3 w-full rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-40 transition"
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
                Paste a job URL or text on the left to generate your tailored CV →
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
                    className={`text-[10px] ${i <= phase ? "text-stone-700" : "text-stone-400"}`}
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
              <button onClick={handleGenerate} className="text-sm font-medium text-red-700 underline">
                Try again
              </button>
            </div>
          </div>
        )}

        {generateState === "done" && cvContent && (
          <div className="flex flex-col items-center py-8 px-6">

            {/* HR read */}
            {angleAnalysis && (
              <div className="w-full max-w-[595px] mb-6">
                <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wider mb-2">HR read</p>
                <p className="text-sm text-stone-600 leading-relaxed">{angleAnalysis.summary}</p>
              </div>
            )}

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

            <div className="overflow-x-auto">
              <CvPreview content={cvContent} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
