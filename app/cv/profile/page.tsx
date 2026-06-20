"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

interface Profile {
  about: Record<string, string>;
  experience: Array<{
    company: string;
    role: string;
    period: string;
    bullets: string[];
  }>;
  skills: Record<string, { label: string; skills: Array<{ name: string; proficiency: string }> }>;
  languages: Array<{ language: string; level: string }>;
  education: Array<{ degree: string; institution: string; year: number }>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/cv/profile")
      .then((r) => r.json())
      .then(setProfile);
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/cv/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
  }

  function updateAbout(key: string, value: string) {
    setProfile((p) => p ? { ...p, about: { ...p.about, [key]: value } } : p);
  }

  function updateBullet(expIdx: number, bulletIdx: number, value: string) {
    setProfile((p) => {
      if (!p) return p;
      const exp = [...p.experience];
      const bullets = [...exp[expIdx].bullets];
      bullets[bulletIdx] = value;
      exp[expIdx] = { ...exp[expIdx], bullets };
      return { ...p, experience: exp };
    });
  }

  function addBullet(expIdx: number) {
    setProfile((p) => {
      if (!p) return p;
      const exp = [...p.experience];
      exp[expIdx] = { ...exp[expIdx], bullets: [...exp[expIdx].bullets, ""] };
      return { ...p, experience: exp };
    });
  }

  function removeBullet(expIdx: number, bulletIdx: number) {
    setProfile((p) => {
      if (!p) return p;
      const exp = [...p.experience];
      const bullets = exp[expIdx].bullets.filter((_, i) => i !== bulletIdx);
      exp[expIdx] = { ...exp[expIdx], bullets };
      return { ...p, experience: exp };
    });
  }

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl pb-24">
      {/* Sticky save bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">My Profile</h1>
          <p className="text-sm text-stone-500">Source of truth for all CV generation</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b] disabled:opacity-50 transition"
        >
          {saveState === "saving" ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
          ) : saveState === "saved" ? (
            <><CheckCircle2 className="h-4 w-4 text-emerald-400" />Saved</>
          ) : (
            <><Save className="h-4 w-4" />Save changes</>
          )}
        </button>
      </div>

      {/* About variants */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-stone-900 mb-3 pb-2 border-b border-stone-200">
          About
        </h2>
        <div className="space-y-4">
          {Object.entries(profile.about).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-stone-500 mb-1 capitalize">{key}</label>
              <textarea
                value={value}
                onChange={(e) => updateAbout(key, e.target.value)}
                rows={key === "long" || key === "linkedin" || key === "recruiter" ? 4 : 2}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none focus:border-stone-400 focus:bg-white resize-none transition"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-stone-900 mb-3 pb-2 border-b border-stone-200">
          Experience
        </h2>
        <div className="space-y-6">
          {profile.experience.map((exp, expIdx) => (
            <div key={expIdx} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-sm font-semibold text-stone-900">{exp.company}</p>
                <span className="text-xs text-stone-500">{exp.period}</span>
              </div>
              <p className="text-xs text-stone-500 mb-3 uppercase tracking-wide">{exp.role}</p>
              <div className="space-y-2">
                {exp.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="flex gap-2">
                    <span className="text-stone-300 mt-2 text-xs">•</span>
                    <textarea
                      value={bullet}
                      onChange={(e) => updateBullet(expIdx, bIdx, e.target.value)}
                      rows={2}
                      className="flex-1 rounded border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs text-stone-800 outline-none focus:border-stone-400 resize-none"
                    />
                    <button
                      onClick={() => removeBullet(expIdx, bIdx)}
                      className="mt-1 text-stone-300 hover:text-red-400 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addBullet(expIdx)}
                  className="mt-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  + Add bullet
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-stone-900 mb-3 pb-2 border-b border-stone-200">
          Skills
        </h2>
        <div className="space-y-4">
          {Object.entries(profile.skills).map(([catKey, cat]) => (
            <div key={catKey} className="rounded-lg border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold text-stone-700 mb-2">{cat.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.skills.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-700"
                  >
                    {s.name}
                    <span className="ml-1 text-stone-400">({s.proficiency})</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Languages + Education (read-only for now) */}
      <section>
        <h2 className="text-sm font-semibold text-stone-900 mb-3 pb-2 border-b border-stone-200">
          Languages & Education
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-xs font-semibold text-stone-700 mb-2">Languages</p>
            {profile.languages.map((l, i) => (
              <p key={i} className="text-sm text-stone-600">
                {l.language} <span className="text-stone-400">({l.level})</span>
              </p>
            ))}
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-xs font-semibold text-stone-700 mb-2">Education</p>
            {profile.education.map((e, i) => (
              <div key={i} className="mb-2">
                <p className="text-xs font-medium text-stone-800">{e.degree}</p>
                <p className="text-xs text-stone-500">{e.institution}, {e.year}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
