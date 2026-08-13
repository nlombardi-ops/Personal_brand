"use client";

import { useState } from "react";
import { Loader2, AlertCircle, Copy, CheckCircle2, RefreshCw, Download } from "lucide-react";
import type { JobAnalysis } from "@/lib/types";

const FIXED_QUESTIONS = [
  "Why does this job appeal to you?",
  "After they read this, what's the one thing you want them to remember about you?",
];

type AnalyzeState = "idle" | "loading" | "done" | "error";
type GenerateState = "idle" | "generating" | "done" | "error";
type VoiceSaveState = "idle" | "saving" | "saved" | "error";

export default function CoverLetterPage() {
  const [url, setUrl] = useState("");
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>("idle");
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");

  const [answers, setAnswers] = useState<string[]>(["", ""]);

  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [clText, setClText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [generateError, setGenerateError] = useState("");
  const [copied, setCopied] = useState(false);
  const [voiceSaveState, setVoiceSaveState] = useState<VoiceSaveState>("idle");

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setAnalyzeState("loading");
    setAnalyzeError("");
    setJobAnalysis(null);
    setGenerateState("idle");
    setClText("");
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
      setAnswers(["", ""]);
    } catch {
      setAnalyzeError("Couldn't reach this URL. Try again.");
      setAnalyzeState("error");
    }
  }

  async function saveVoiceSamples(entries: Array<{ text: string; context: string }>) {
    setVoiceSaveState("saving");
    try {
      const res = await fetch("/api/cv/voice-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error(await res.text());
      setVoiceSaveState("saved");
    } catch {
      setVoiceSaveState("error");
    }
  }

  async function handleGenerate() {
    if (!jobAnalysis) return;
    setGenerateState("generating");
    setGenerateError("");
    setClText("");
    setVoiceSaveState("idle");

    const answersPayload = FIXED_QUESTIONS
      .map((q, i) => ({ question: q, answer: answers[i] ?? "" }))
      .filter((a) => a.answer.trim().length > 10);

    try {
      const res = await fetch("/api/cv/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_analysis: jobAnalysis, answers: answersPayload }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setClText(data.text);
      setWordCount(data.word_count);
      setGenerateState("done");

      if (answersPayload.length > 0) {
        saveVoiceSamples(
          answersPayload.map((a) => ({
            text: a.answer,
            context: `${jobAnalysis.role_title} at ${jobAnalysis.company}`,
          }))
        );
      }
    } catch {
      setGenerateError("Generation failed. Please try again.");
      setGenerateState("error");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(clText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadPdf() {
    if (!clText || !jobAnalysis) return;
    const res = await fetch("/api/cv/cover-letter/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clText, company: jobAnalysis.company }),
    });
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `cover-letter-${jobAnalysis.company.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(href);
  }

  const hasAnalysis = analyzeState === "done" && jobAnalysis;
  const wordColor =
    wordCount < 220 ? "text-amber-600" : wordCount > 310 ? "text-red-600" : "text-emerald-600";

  return (
    <div className="flex h-screen min-w-[1024px]">
      {/* ── Left panel ── */}
      <div className="w-[360px] flex-shrink-0 border-r border-stone-200 bg-white overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h1 className="text-base font-semibold text-stone-900 mb-1">Cover Letter</h1>
          <p className="text-xs text-stone-500 mb-4">Industry format · 250–300 words</p>

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
                  { label: "Tone", value: jobAnalysis.company_tone },
                  { label: "Industry", value: jobAnalysis.industry },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2 text-[10px]">
                    <span className="text-stone-500 w-14 flex-shrink-0">{label}</span>
                    <span className="text-stone-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fixed HR questions */}
          {hasAnalysis && (
            <div className="mb-4 space-y-3">
              {FIXED_QUESTIONS.map((q, i) => (
                <div key={i}>
                  <label className="block text-xs font-medium text-stone-600 mb-1.5">{q}</label>
                  <textarea
                    value={answers[i] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    placeholder="Type your answer, in your own words…"
                    rows={2}
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 placeholder-stone-400 outline-none focus:border-stone-400 focus:bg-white resize-none transition"
                  />
                </div>
              ))}
              <p className="text-[10px] text-stone-400">
                Optional, but this is how the letter learns to sound like you.
              </p>
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
                  Writing…
                </>
              ) : generateState === "done" ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </>
              ) : (
                "Generate Cover Letter"
              )}
            </button>
          )}
        </div>

        {/* Format guide */}
        <div className="border-t border-stone-200 p-4 space-y-2">
          <p className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Structure</p>
          {[
            { label: "P1", desc: "Hook — their work + who you are" },
            { label: "P2", desc: "Evidence — 2-3 achievements as business value" },
            { label: "P3", desc: "Close — 90-day value + active call to action" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex gap-2 text-[11px]">
              <span className="font-semibold text-stone-600 w-5 flex-shrink-0">{label}</span>
              <span className="text-stone-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-y-auto bg-stone-50">
        {generateState === "idle" && (
          <div className="flex h-full items-center justify-center">
            <p className="text-stone-400 text-sm max-w-xs text-center">
              Analyze a job URL on the left to generate your cover letter →
            </p>
          </div>
        )}

        {generateState === "generating" && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin text-stone-400 mx-auto mb-3" />
              <p className="text-sm text-stone-600">Writing your cover letter…</p>
              <p className="text-xs text-stone-400 mt-1">Applying anti-AI fingerprint rules</p>
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

        {generateState === "done" && clText && (
          <div className="p-8 max-w-2xl mx-auto">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">
                  {jobAnalysis?.company} — {jobAnalysis?.role_title}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  <span className={`font-medium ${wordColor}`}>{wordCount} words</span>
                  {" · "}
                  {wordCount < 220 ? "too short" : wordCount > 310 ? "too long" : "good length"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1e293b] transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
              </div>
            </div>

            {voiceSaveState !== "idle" && (
              <p className="mb-3 flex items-center gap-1.5 text-[11px] text-stone-400">
                {voiceSaveState === "saving" && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving your answers to your voice profile…
                  </>
                )}
                {voiceSaveState === "saved" && (
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Saved to your voice profile — future letters will sound more like you
                  </span>
                )}
                {voiceSaveState === "error" && "Couldn't save your answers to your voice profile."}
              </p>
            )}

            {/* Letter paper */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-10">
              <textarea
                value={clText}
                onChange={(e) => {
                  setClText(e.target.value);
                  setWordCount(e.target.value.split(/\s+/).filter(Boolean).length);
                }}
                className="w-full text-sm text-stone-800 leading-7 resize-none outline-none"
                style={{ minHeight: "380px", fontFamily: "Georgia, serif" }}
              />
            </div>

            <p className="mt-3 text-xs text-stone-400 text-center">
              Editable — make it yours before sending. Word count updates as you type.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
