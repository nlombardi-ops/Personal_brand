"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,

  Send,
  Loader2,
  Copy,
  CheckCircle2,
  Minimize2,
} from "lucide-react";
import type { JobAnalysis } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What makes you the right hire for this position?",
  "Why do you want to work here?",
  "Draft a short note to the recruiter",
];

export default function ApplicationChat({
  jobAnalysis,
  angleSummary,
  coverLetter,
  onCost,
}: {
  jobAnalysis: JobAnalysis;
  angleSummary?: string;
  coverLetter?: string;
  onCost?: (usd: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/cv/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_analysis: jobAnalysis,
          angle_summary: angleSummary ?? "",
          cover_letter: coverLetter ?? "",
          messages: next,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(b.error ?? res.statusText);
      }
      const data: { text: string; _cost_usd?: number } = await res.json();
      if (data._cost_usd && onCost) onCost(data._cost_usd);
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, idx: number) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  // ── Collapsed ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#0f172a] pl-4 pr-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#1e293b] transition"
      >
        <MessageSquare className="h-4 w-4" />
        Application questions
        {messages.length > 0 && (
          <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
            {messages.filter((m) => m.role === "assistant").length}
          </span>
        )}
      </button>
    );
  }

  // ── Expanded ──
  return (
    <div className="fixed bottom-5 right-5 z-50 flex w-[440px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-stone-200 bg-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">Application questions</p>
          <p className="truncate text-[11px] text-stone-500">
            {jobAnalysis.role_title} · {jobAnalysis.company}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="rounded px-2 py-1 text-[11px] text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="rounded p-1.5 text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition"
            aria-label="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[420px] min-h-[220px] flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !loading && (
          <div className="py-2">
            <p className="mb-3 text-xs text-stone-500">
              Paste the question the form is asking. Answers come back short and ready to paste,
              grounded in your profile.
            </p>
            <div className="space-y-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-left text-xs text-stone-600 hover:border-stone-300 hover:bg-white transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="mb-3 flex justify-end">
              <div className="max-w-[85%] rounded-lg rounded-br-sm bg-[#0f172a] px-3 py-2 text-xs text-white">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={i} className="mb-3">
              <div className="rounded-lg rounded-bl-sm border border-stone-200 bg-stone-50 px-3 py-2.5">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-800">
                  {m.content}
                </p>
              </div>
              <div className="mt-1 flex items-center gap-3 pl-1">
                <button
                  onClick={() => copy(m.content, i)}
                  className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-600 transition"
                >
                  {copiedIdx === i ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
                <span className="text-[10px] text-stone-300">
                  {m.content.split(/\s+/).filter(Boolean).length} words
                </span>
                <button
                  onClick={() => send("Shorter and crisper — cut the detail, keep the strongest claim.")}
                  className="text-[10px] text-stone-400 hover:text-stone-600 transition"
                >
                  Shorter
                </button>
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex items-center gap-2 py-2 text-xs text-stone-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Drafting…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-stone-200 p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder="Paste the application question…"
            className="flex-1 resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 placeholder-stone-400 outline-none transition focus:border-stone-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-[#0f172a] p-2.5 text-white transition hover:bg-[#1e293b] disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-stone-400">Enter to send · Shift+Enter for a new line</p>
      </form>
    </div>
  );
}
