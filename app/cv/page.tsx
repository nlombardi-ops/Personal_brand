"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Link,
  Mail,
  Copy,
  X,
} from "lucide-react";
import CvPreview from "@/app/components/cv/CvPreview";
import ApplicationChat from "@/app/components/cv/ApplicationChat";
import type { JobAnalysis, CvContent, AngleAnalysis, HrQuestions } from "@/lib/types";

// The two motivation questions that feed the cover letter's hook and close
const CL_QUESTIONS = [
  "Why does this job appeal to you?",
  "After they read this, what's the one thing you want them to remember about you?",
];

type InputMode = "url" | "text";
type AnalyzeState = "idle" | "loading" | "done" | "error";
type QuestionState = "idle" | "loading" | "done" | "error";
type GenerateState = "idle" | "generating" | "done" | "error";
type EnrichState = "idle" | "saving" | "saved" | "error";
type DriveState = "idle" | "uploading" | "uploaded" | "error";
type HistoryState = "idle" | "saving" | "saved" | "error";
type VoiceSaveState = "idle" | "saving" | "saved" | "error";
type ResultTab = "cv" | "cover-letter";

// API routes return { error: "..." } as JSON — surface that message, not a generic string
async function extractErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return parsed.error ?? text;
  } catch {
    return text;
  }
}

export default function GeneratorPage() {
  // ── Input ──
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Analyze ──
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>("idle");
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");

  // ── What to generate ──
  const [wantCv, setWantCv] = useState(true);
  const [wantCl, setWantCl] = useState(true);

  // ── HR Read + Questions ──
  const [questionState, setQuestionState] = useState<QuestionState>("idle");
  const [angleAnalysis, setAngleAnalysis] = useState<AngleAnalysis | null>(null);
  const [hrQuestions, setHrQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [clAnswers, setClAnswers] = useState<string[]>(["", ""]);

  // ── Generate ──
  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [cvContent, setCvContent] = useState<CvContent | null>(null);
  const [clText, setClText] = useState("");
  const [clWordCount, setClWordCount] = useState(0);
  const [resultTab, setResultTab] = useState<ResultTab>("cv");
  const [generateError, setGenerateError] = useState("");
  const [totalCost, setTotalCost] = useState(0);
  const [phase, setPhase] = useState(0);
  const [copied, setCopied] = useState(false);

  // ── Post-generation saves ──
  const [historyState, setHistoryState] = useState<HistoryState>("idle");
  const [historyError, setHistoryError] = useState("");
  const [enrichState, setEnrichState] = useState<EnrichState>("idle");
  const [enrichError, setEnrichError] = useState("");
  const [pendingEnrichment, setPendingEnrichment] = useState<{
    answers: Array<{ question: string; answer: string }>;
    job_context: string;
  } | null>(null);
  const [driveState, setDriveState] = useState<DriveState>("idle");
  const [driveError, setDriveError] = useState("");
  const [voiceSaveState, setVoiceSaveState] = useState<VoiceSaveState>("idle");
  const phaseRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const genPhases = [
    "Reading your profile…",
    "Matching experience to role…",
    wantCv && wantCl ? "Drafting CV + cover letter…" : wantCv ? "Drafting your CV…" : "Drafting your cover letter…",
  ];

  // ── PDF upload ──
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

  // ── Analyze ──
  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    const usingUrl = inputMode === "url" && url.trim();
    const usingText = pastedText.trim().length > 50;
    if (!usingUrl && !usingText) return;

    setAnalyzeState("loading");
    setAnalyzeError("");
    setJobAnalysis(null);
    setQuestionState("idle");
    setAngleAnalysis(null);
    setHrQuestions([]);
    setAnswers([]);
    setClAnswers(["", ""]);
    setGenerateState("idle");
    setCvContent(null);
    setClText("");
    setHistoryState("idle");
    setHistoryError("");
    setVoiceSaveState("idle");
    setTotalCost(0);

    try {
      const body: Record<string, string> = {};
      if (usingUrl) body.url = url.trim();
      if (usingText) body.text = pastedText.trim();

      const res = await fetch("/api/cv/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(b.error ?? res.statusText);
      }
      const data: JobAnalysis & { _cost_usd?: number } = await res.json();
      setTotalCost((c) => c + (data._cost_usd ?? 0));
      setJobAnalysis(data);
      setAnalyzeState("done");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed.");
      setAnalyzeState("error");
    }
  }

  // After analyze succeeds → fire HR read + questions in parallel.
  // This runs regardless of what's selected for generation — the read is the point of pasting a link.
  useEffect(() => {
    if (analyzeState !== "done" || !jobAnalysis) return;
    setQuestionState("loading");

    Promise.all([
      fetch("/api/cv/angle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_analysis: jobAnalysis }),
      }),
      fetch("/api/cv/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_analysis: jobAnalysis }),
      }),
    ])
      .then(async ([angleRes, questionsRes]) => {
        if (angleRes.ok) {
          const a: AngleAnalysis & { _cost_usd?: number } = await angleRes.json();
          setTotalCost((c) => c + (a._cost_usd ?? 0));
          setAngleAnalysis(a);
        }
        if (questionsRes.ok) {
          const q: HrQuestions & { _cost_usd?: number } = await questionsRes.json();
          setTotalCost((c) => c + (q._cost_usd ?? 0));
          setHrQuestions(q.questions ?? []);
          setAnswers(new Array(q.questions?.length ?? 0).fill(""));
        }
        setQuestionState("done");
      })
      .catch(() => setQuestionState("error"));
  }, [analyzeState, jobAnalysis]);

  // ── Profile enrichment (save HR-question answers into the candidate's full context) ──
  async function saveEnrichment(payload: { answers: Array<{ question: string; answer: string }>; job_context: string }) {
    setEnrichState("saving");
    setEnrichError("");
    setPendingEnrichment(payload);
    try {
      const res = await fetch("/api/cv/enrich-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      setEnrichState("saved");
    } catch (err) {
      console.error("saveEnrichment failed:", err);
      setEnrichError(err instanceof Error ? err.message : String(err));
      setEnrichState("error");
    }
  }

  // ── Save the cover-letter motivation answers as real writing samples ──
  async function saveVoiceSamples(entries: Array<{ text: string; context: string }>) {
    setVoiceSaveState("saving");
    try {
      const res = await fetch("/api/cv/voice-samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      setVoiceSaveState("saved");
    } catch {
      setVoiceSaveState("error");
    }
  }

  // ── Save generated CV PDF into the "CVs" folder on Google Drive ──
  async function saveToDrive(content: CvContent) {
    setDriveState("uploading");
    setDriveError("");
    try {
      const res = await fetch("/api/cv/drive-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      setDriveState("uploaded");
    } catch (err) {
      console.error("saveToDrive failed:", err);
      setDriveError(err instanceof Error ? err.message : String(err));
      setDriveState("error");
    }
  }

  // ── Save every generated CV into History — every job analyzed gets a record ──
  async function saveToHistory(content: CvContent) {
    setHistoryState("saving");
    setHistoryError("");
    try {
      const res = await fetch("/api/cv/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, job_url: url }),
      });
      if (!res.ok) throw new Error(await extractErrorMessage(res));
      setHistoryState("saved");
    } catch (err) {
      console.error("saveToHistory failed:", err);
      setHistoryError(err instanceof Error ? err.message : String(err));
      setHistoryState("error");
    }
  }

  // ── Generate (CV and/or cover letter, in parallel) ──
  async function handleGenerate() {
    if (!jobAnalysis || (!wantCv && !wantCl)) return;
    setGenerateState("generating");
    setGenerateError("");
    setCvContent(null);
    setClText("");
    setHistoryState("idle");
    setHistoryError("");
    setEnrichState("idle");
    setEnrichError("");
    setPendingEnrichment(null);
    setDriveState("idle");
    setDriveError("");
    setVoiceSaveState("idle");
    setPhase(0);

    phaseRef.current = setInterval(() => {
      setPhase((p) => Math.min(p + 1, genPhases.length - 1));
    }, 4000);

    const answersPayload = hrQuestions
      .map((q, i) => ({ question: q, answer: answers[i] ?? "" }))
      .filter((a) => a.answer.trim().length > 10);

    const clAnswersPayload = CL_QUESTIONS
      .map((q, i) => ({ question: q, answer: clAnswers[i] ?? "" }))
      .filter((a) => a.answer.trim().length > 10);

    try {
      const [cvRes, clRes] = await Promise.all([
        wantCv
          ? fetch("/api/cv/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                job_analysis: jobAnalysis,
                answers: answersPayload,
                angle_summary: angleAnalysis?.summary ?? "",
              }),
            })
          : Promise.resolve(null),
        wantCl
          ? fetch("/api/cv/cover-letter", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                job_analysis: jobAnalysis,
                answers: clAnswersPayload,
              }),
            })
          : Promise.resolve(null),
      ]);

      if (cvRes && !cvRes.ok) throw new Error(await extractErrorMessage(cvRes));
      if (clRes && !clRes.ok) throw new Error(await extractErrorMessage(clRes));

      let generatedCv: CvContent | null = null;
      if (cvRes) {
        const data: CvContent & { _cost_usd?: number } = await cvRes.json();
        setTotalCost((c) => c + (data._cost_usd ?? 0));
        setCvContent(data);
        generatedCv = data;
      }
      if (clRes) {
        const data: { text: string; word_count: number; _cost_usd?: number } = await clRes.json();
        setTotalCost((c) => c + (data._cost_usd ?? 0));
        setClText(data.text);
        setClWordCount(data.word_count);
      }

      setResultTab(wantCv ? "cv" : "cover-letter");
      setGenerateState("done");

      // Save the answered HR questions into the candidate's full profile context
      if (answersPayload.length > 0) {
        saveEnrichment({
          answers: answersPayload,
          job_context: `${jobAnalysis.role_title} at ${jobAnalysis.company}`,
        });
      }

      // The motivation answers are real writing in the candidate's own voice
      if (wantCl && clAnswersPayload.length > 0) {
        saveVoiceSamples(
          clAnswersPayload.map((a) => ({
            text: a.answer,
            context: `${jobAnalysis.role_title} at ${jobAnalysis.company}`,
          }))
        );
      }

      // Every generated CV is uploaded to Drive and recorded in History
      if (generatedCv) {
        saveToDrive(generatedCv);
        saveToHistory(generatedCv);
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed. Please try again.");
      setGenerateState("error");
    } finally {
      if (phaseRef.current) clearInterval(phaseRef.current);
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

  async function handleDownloadCl() {
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

  async function handleCopyCl() {
    await navigator.clipboard.writeText(clText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    return () => { if (phaseRef.current) clearInterval(phaseRef.current); };
  }, []);

  const canAnalyze =
    (inputMode === "url" && url.trim().length > 0) || pastedText.trim().length > 50;

  const generateLabel =
    wantCv && wantCl ? "Generate CV + Cover Letter" : wantCv ? "Generate CV" : "Generate Cover Letter";

  return (
    <div className="flex h-screen min-w-[1024px]">
      {/* ── Left panel ── */}
      <div className="w-[360px] flex-shrink-0 border-r border-stone-200 bg-white overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h1 className="text-base font-semibold text-stone-900 mb-4">Generate</h1>

          {/* Input mode tabs */}
          <div className="flex rounded-lg border border-stone-200 overflow-hidden mb-4 text-xs font-medium">
            <button
              onClick={() => setInputMode("url")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition ${
                inputMode === "url" ? "bg-[#0f172a] text-white" : "bg-white text-stone-500 hover:bg-stone-50"
              }`}
            >
              <Link className="h-3 w-3" />
              URL
            </button>
            <button
              onClick={() => setInputMode("text")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition ${
                inputMode === "text" ? "bg-[#0f172a] text-white" : "bg-white text-stone-500 hover:bg-stone-50"
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
                <p className="mt-1.5 text-[10px] text-stone-400">Blocked by the site? Switch to Paste / PDF.</p>
              </>
            ) : (
              <>
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
                <div className="mb-3">
                  {pdfName ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate flex-1">{pdfName}</span>
                      <button type="button" onClick={() => { setPdfName(""); setPastedText(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
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
                      {pdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      {pdfLoading ? "Reading PDF…" : "Upload job description PDF"}
                    </button>
                  )}
                  {pdfError && <p className="mt-1 text-[10px] text-red-600">{pdfError}</p>}
                </div>
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
                  {pastedText.trim().length > 0 && pastedText.trim().length < 50 ? " — paste at least 50 chars" : ""}
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
          {analyzeState === "done" && jobAnalysis && (
            <>
              <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-stone-900">{jobAnalysis.company}</p>
                  <span className="text-[10px] text-stone-500 capitalize">{jobAnalysis.seniority}</span>
                </div>
                <p className="text-xs text-stone-700">{jobAnalysis.role_title}</p>
                <p className="text-[10px] text-stone-500 italic">{jobAnalysis.role_focus}</p>
                <div className="pt-1 border-t border-stone-200 space-y-1.5">
                  {[{ label: "Industry", value: jobAnalysis.industry }, { label: "Tone", value: jobAnalysis.company_tone }].map(({ label, value }) => (
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
                      <span key={kw} className="rounded bg-[#0f172a]/8 px-1.5 py-0.5 text-[9px] text-[#0f172a] font-medium">{kw}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* What to generate */}
              <div className="mt-4">
                <p className="text-[10px] font-medium text-stone-500 uppercase tracking-wider mb-2">Generate</p>
                <div className="space-y-1.5">
                  {[
                    { on: wantCv, set: setWantCv, icon: FileText, label: "CV", hint: "Tailored, saved to Drive + History" },
                    { on: wantCl, set: setWantCl, icon: Mail, label: "Cover letter", hint: "3 paragraphs, your voice" },
                  ].map(({ on, set, icon: Icon, label, hint }) => (
                    <button
                      key={label}
                      onClick={() => set(!on)}
                      className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                        on ? "border-[#0f172a] bg-[#0f172a]/5" : "border-stone-200 bg-white hover:border-stone-300"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${
                          on ? "border-[#0f172a] bg-[#0f172a]" : "border-stone-300 bg-white"
                        }`}
                      >
                        {on && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </span>
                      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${on ? "text-[#0f172a]" : "text-stone-400"}`} />
                      <span className="min-w-0">
                        <span className={`block text-xs font-medium ${on ? "text-stone-900" : "text-stone-600"}`}>{label}</span>
                        <span className="block text-[10px] text-stone-400">{hint}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {!wantCv && !wantCl && (
                  <p className="mt-2 text-[10px] text-amber-600">Pick at least one — or just use the chat.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-y-auto bg-stone-50">

        {/* Idle */}
        {analyzeState === "idle" && (
          <div className="flex h-full items-center justify-center">
            <p className="text-stone-400 text-sm max-w-xs text-center">
              Paste a job URL or text on the left to get started →
            </p>
          </div>
        )}

        {/* Analyzing */}
        {analyzeState === "loading" && (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-2 text-stone-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading the job posting…
            </div>
          </div>
        )}

        {/* Analyze error */}
        {analyzeState === "error" && (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-5 text-center max-w-sm">
              <p className="text-sm text-red-700">{analyzeError}</p>
            </div>
          </div>
        )}

        {/* HR Read + Questions */}
        {(analyzeState === "done" && generateState === "idle") && (
          <div
            className="max-w-2xl mx-auto py-8 px-6 transition-opacity duration-300"
            style={{ opacity: questionState === "loading" ? 0.4 : 1 }}
          >
            {questionState === "loading" && (
              <div className="flex items-center gap-2 text-stone-400 text-xs mb-6">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reading the role…
              </div>
            )}

            {/* HR Read — always runs, whatever is selected */}
            {angleAnalysis && (
              <div className="border-l-4 border-stone-400 bg-white rounded-r-lg p-4 mb-6">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">HR read</p>
                <p className="text-sm text-stone-700 leading-relaxed">{angleAnalysis.summary}</p>
              </div>
            )}

            {/* CV questions */}
            {questionState === "done" && wantCv && hrQuestions.length > 0 && (
              <>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4">Interview prep</p>
                {hrQuestions.map((q, i) => (
                  <div key={i} className="border-l-4 border-stone-300 bg-white rounded-r-lg p-4 mb-4">
                    <p className="text-sm font-medium text-stone-700 mb-1">{q}</p>
                    <p className="text-xs text-stone-400 italic mb-2">optional</p>
                    <textarea
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswers((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
                      placeholder="Type your answer…"
                      rows={3}
                      className="w-full rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 placeholder-stone-400 outline-none focus:border-stone-400 focus:bg-white resize-none transition"
                    />
                  </div>
                ))}
              </>
            )}

            {/* Cover-letter motivation questions */}
            {questionState === "done" && wantCl && (
              <>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-4 mt-8">
                  Cover letter — motivation
                </p>
                {CL_QUESTIONS.map((q, i) => (
                  <div key={i} className="border-l-4 border-stone-300 bg-white rounded-r-lg p-4 mb-4">
                    <p className="text-sm font-medium text-stone-700 mb-1">{q}</p>
                    <p className="text-xs text-stone-400 italic mb-2">optional — but this is what makes it sound like you</p>
                    <textarea
                      value={clAnswers[i] ?? ""}
                      onChange={(e) => setClAnswers((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
                      placeholder="Type your answer…"
                      rows={3}
                      className="w-full rounded border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 placeholder-stone-400 outline-none focus:border-stone-400 focus:bg-white resize-none transition"
                    />
                  </div>
                ))}
              </>
            )}

            {/* Action button */}
            {(questionState === "done" || questionState === "error") && (
              <div className="mt-6">
                <button
                  onClick={() => handleGenerate()}
                  disabled={!wantCv && !wantCl}
                  className="w-full rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-40 transition"
                >
                  {generateLabel}
                </button>
                <p className="mt-2 text-[10px] text-stone-400 text-center">
                  Anything you typed above is saved to your profile automatically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Generating */}
        {generateState === "generating" && (
          <div className="flex h-full items-center justify-center">
            <div className="w-72">
              <p className="text-sm font-medium text-stone-700 mb-4 text-center">{genPhases[phase]}</p>
              <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full bg-[#0f172a] rounded-full transition-all duration-1000"
                  style={{ width: `${((phase + 1) / genPhases.length) * 85}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                {genPhases.map((_, i) => (
                  <span key={i} className={`text-[10px] ${i <= phase ? "text-stone-700" : "text-stone-400"}`}>{i + 1}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generate error */}
        {generateState === "error" && (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-xl border border-red-100 bg-red-50 px-6 py-5 text-center max-w-sm">
              <p className="text-sm text-red-700 mb-3">{generateError}</p>
              <button onClick={() => handleGenerate()} className="text-sm font-medium text-red-700 underline">Try again</button>
            </div>
          </div>
        )}

        {/* Results */}
        {generateState === "done" && (cvContent || clText) && (
          <div className="flex flex-col">
            {/* Sticky HR read + result tabs */}
            <div className="sticky top-0 z-10 bg-stone-50 px-6 pt-4 pb-3 border-b border-stone-100">
              {angleAnalysis && (
                <div className="max-w-[595px] mx-auto border-l-4 border-stone-400 bg-white rounded-r-lg px-4 py-3">
                  <p className="text-[10px] font-medium text-stone-500 uppercase tracking-wider mb-1">HR read</p>
                  <p className="text-xs text-stone-600 leading-relaxed">{angleAnalysis.summary}</p>
                </div>
              )}
              {cvContent && clText && (
                <div className="max-w-[595px] mx-auto mt-3 flex rounded-lg border border-stone-200 overflow-hidden text-xs font-medium bg-white">
                  {([
                    { id: "cv" as ResultTab, label: "CV", icon: FileText },
                    { id: "cover-letter" as ResultTab, label: "Cover letter", icon: Mail },
                  ]).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setResultTab(id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition ${
                        resultTab === id ? "bg-[#0f172a] text-white" : "text-stone-500 hover:bg-stone-50"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-center py-6 px-6">
              {/* ── CV ── */}
              {cvContent && (!clText || resultTab === "cv") && (
                <>
                  <div className="flex items-center gap-3 mb-6 w-full max-w-[595px]">
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] transition"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                    {totalCost > 0 && (
                      <span className="ml-auto text-[10px] text-stone-400">~${totalCost.toFixed(4)}</span>
                    )}
                  </div>

                  {(historyState !== "idle" || enrichState !== "idle" || driveState !== "idle") && (
                    <div className="flex flex-col gap-1 mb-4 w-full max-w-[595px] text-xs">
                      {historyState === "saving" && (
                        <span className="flex items-center gap-1.5 text-stone-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving to History…
                        </span>
                      )}
                      {historyState === "saved" && (
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Saved to History
                        </span>
                      )}
                      {historyState === "error" && (
                        <div className="text-red-600">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Couldn&apos;t save to History.
                            <button onClick={() => cvContent && saveToHistory(cvContent)} className="underline font-medium">Retry</button>
                          </span>
                          {historyError && <span className="ml-5 text-[11px] text-red-500">{historyError}</span>}
                        </div>
                      )}

                      {enrichState === "saving" && (
                        <span className="flex items-center gap-1.5 text-stone-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving your answers to your profile…
                        </span>
                      )}
                      {enrichState === "saved" && (
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Answers saved to your profile — they&apos;ll inform future CVs
                        </span>
                      )}
                      {enrichState === "error" && (
                        <div className="text-red-600">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Couldn&apos;t save your answers to your profile.
                            <button onClick={() => pendingEnrichment && saveEnrichment(pendingEnrichment)} className="underline font-medium">Retry</button>
                          </span>
                          {enrichError && <span className="ml-5 text-[11px] text-red-500">{enrichError}</span>}
                        </div>
                      )}

                      {driveState === "uploading" && (
                        <span className="flex items-center gap-1.5 text-stone-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Saving PDF to Google Drive…
                        </span>
                      )}
                      {driveState === "uploaded" && (
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Saved to your Drive &ldquo;CVs&rdquo; folder
                        </span>
                      )}
                      {driveState === "error" && (
                        <div className="text-red-600">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Couldn&apos;t save to Google Drive.
                            <button onClick={() => cvContent && saveToDrive(cvContent)} className="underline font-medium">Retry</button>
                          </span>
                          {driveError && <span className="ml-5 text-[11px] text-red-500">{driveError}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <CvPreview content={cvContent} />
                  </div>
                </>
              )}

              {/* ── Cover letter ── */}
              {clText && (!cvContent || resultTab === "cover-letter") && (
                <div className="w-full max-w-[595px]">
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={handleCopyCl}
                      className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] transition"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy text"}
                    </button>
                    <button
                      onClick={handleDownloadCl}
                      className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </button>
                    <span className="ml-auto text-[10px] text-stone-400">{clWordCount} words</span>
                  </div>

                  {voiceSaveState === "saved" && (
                    <div className="mb-4 flex items-center gap-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Your answers were saved as writing samples — future letters sound more like you
                    </div>
                  )}

                  <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">{clText}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Application-question chat — available as soon as the role is read ── */}
      {jobAnalysis && (
        <ApplicationChat
          jobAnalysis={jobAnalysis}
          angleSummary={angleAnalysis?.summary}
          coverLetter={clText}
          onCost={(usd) => setTotalCost((c) => c + usd)}
        />
      )}
    </div>
  );
}
