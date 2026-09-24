"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Copy, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import type { JobAnalysis } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type InputMode = "url" | "paste";
type AnalyzeState = "idle" | "loading" | "done" | "error";

const SUGGESTIONS = [
  "What makes you the right hire for this position?",
  "Please briefly describe what qualifies you for this role.",
  "Why do you want to work for this company?",
  "What is your biggest professional achievement?",
  "Describe a time you led a team through a difficult change.",
];

const LENGTH_OPTIONS = [
  { label: "Short ~80", value: 80 },
  { label: "Medium ~150", value: 150 },
  { label: "Long ~250", value: 250 },
];

export default function AnswersPage() {
  // ── Job context (optional) ──
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>("idle");
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");

  // ── Length ──
  const [targetWords, setTargetWords] = useState(150);

  // ── Chat ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const pastedLength = pastedText.trim().length;
  const canAnalyze =
    (inputMode === "url" && url.trim().length > 0) || (inputMode === "paste" && pastedLength >= 50);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!canAnalyze || analyzeState === "loading") return;
    setAnalyzeState("loading");
    setAnalyzeError("");
    try {
      const res = await fetch("/api/cv/analyze-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          inputMode === "url" ? { url: url.trim() } : { text: pastedText.trim() }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setJobAnalysis(data as JobAnalysis);
      setAnalyzeState("done");
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Couldn't analyze this job. Try again.");
      setAnalyzeState("error");
    }
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/cv/answer-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          job_analysis: jobAnalysis ?? undefined,
          target_words: targetWords,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(index: number, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="flex flex-col md:h-screen md:flex-row">
      {/* ── Left panel ── */}
      <div className="flex w-full flex-col border-b border-stone-200 bg-white md:w-[360px] md:flex-shrink-0 md:border-b-0 md:border-r md:overflow-y-auto">
        <div className="p-6 flex-1">
          <h1 className="text-base font-semibold text-stone-900 mb-1">Application Q&amp;A</h1>
          <p className="text-xs text-stone-500 mb-4">
            Answers are grounded in your saved profile — adding a job below is optional.
          </p>

          {/* Mode toggle */}
          <div className="mb-3 flex rounded-lg border border-stone-200 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => setInputMode("url")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition ${
                inputMode === "url" ? "bg-[#0f172a] text-white" : "bg-white text-stone-500 hover:bg-stone-50"
              }`}
            >
              URL
            </button>
            <button
              type="button"
              onClick={() => setInputMode("paste")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition ${
                inputMode === "paste" ? "bg-[#0f172a] text-white" : "bg-white text-stone-500 hover:bg-stone-50"
              }`}
            >
              Paste JD
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
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-stone-400 focus:bg-white transition pr-9"
                  />
                  {analyzeState === "loading" && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-stone-400" />
                  )}
                </div>
              </>
            ) : (
              <>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Paste job description</label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste the full job description here…"
                  rows={8}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 placeholder-stone-400 outline-none focus:border-stone-400 focus:bg-white resize-none transition"
                />
                <p className="mt-1.5 text-[10px] text-stone-400">
                  {pastedLength}/50 characters minimum
                  {pastedLength < 50 && pastedLength > 0 ? " — keep going" : ""}
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
              disabled={!canAnalyze || analyzeState === "loading"}
              className="mt-2 w-full rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-40 transition"
            >
              {analyzeState === "loading" ? "Analyzing…" : "Analyze"}
            </button>
          </form>

          {/* Job analysis card */}
          {analyzeState === "done" && jobAnalysis && (
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

          <p className="mb-6 text-[10px] text-stone-400">
            Job context is optional — the chat stays grounded in your profile without it.
          </p>

          {/* Length selector */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Answer length</label>
            <div className="flex rounded-lg border border-stone-200 overflow-hidden text-xs font-medium">
              {LENGTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTargetWords(opt.value)}
                  className={`flex-1 py-2 transition ${
                    targetWords === opt.value
                      ? "bg-[#0f172a] text-white"
                      : "bg-white text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-stone-400">Targeting ~{targetWords} words per answer.</p>
          </div>
        </div>
      </div>

      {/* ── Right panel: chat ── */}
      <div className="flex flex-1 min-w-0 flex-col bg-stone-50 md:overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 min-h-[45vh] md:p-6 md:min-h-0">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageSquare className="h-6 w-6 text-stone-300 mb-3" />
              <p className="text-sm text-stone-500 mb-4 max-w-xs">
                Ask an application-form question and get a paste-ready answer.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%]">
                    <div
                      className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-stone-900 text-white"
                          : "bg-white border border-stone-200 text-stone-700"
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.role === "assistant" && (
                      <button
                        onClick={() => handleCopy(i, m.content)}
                        className="mt-1 flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-700 transition"
                      >
                        {copiedIndex === i ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting…
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="px-4 pt-2 text-xs text-red-600 md:px-6">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-stone-200 bg-white p-3 md:p-4"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste an application question…"
            className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
