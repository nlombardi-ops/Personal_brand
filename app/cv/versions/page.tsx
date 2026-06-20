"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import type { CvVersion } from "@/app/api/cv/versions/route";
import type { Application } from "@/app/api/cv/applications/route";

const STATUS_OPTIONS = ["applied", "interview_1", "interview_2", "offer", "rejected", "ghosted"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<Status, string> = {
  applied: "Applied",
  interview_1: "Interview I",
  interview_2: "Interview II",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

const STATUS_COLORS: Record<Status, string> = {
  applied: "bg-blue-100 text-blue-700",
  interview_1: "bg-amber-100 text-amber-700",
  interview_2: "bg-orange-100 text-orange-700",
  offer: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
  ghosted: "bg-stone-100 text-stone-500",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function VersionsPage() {
  const [versions, setVersions] = useState<CvVersion[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/cv/versions").then((r) => r.json()),
      fetch("/api/cv/applications").then((r) => r.json()),
    ]).then(([v, a]) => {
      setVersions(v);
      setApplications(a);
      setLoading(false);
    });
  }, []);

  async function handleStatusChange(versionId: string, status: Status) {
    const existing = applications.find((a) => a.cv_version_id === versionId);
    if (existing) {
      await fetch(`/api/cv/applications/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setApplications((apps) =>
        apps.map((a) => (a.id === existing.id ? { ...a, status } : a))
      );
    } else {
      const res = await fetch("/api/cv/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_version_id: versionId, status }),
      });
      const newApp: Application = await res.json();
      setApplications((apps) => [...apps, newApp]);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-stone-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-lg font-semibold text-stone-900 mb-1">History</h1>
      <p className="text-sm text-stone-500 mb-6">All generated CVs</p>

      {versions.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
          <p className="text-stone-400 text-sm">No CVs generated yet.</p>
          <a href="/cv" className="mt-2 inline-block text-sm font-medium text-[#0f172a] underline">
            Generate your first CV →
          </a>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-stone-600">Company</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-stone-600">Role</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-stone-600">Generated</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-stone-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                const app = applications.find((a) => a.cv_version_id === v.id);
                const status = (app?.status ?? "") as Status | "";
                return (
                  <tr key={v.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-900">{v.company}</td>
                    <td className="px-4 py-3 text-stone-600">{v.role_title}</td>
                    <td className="px-4 py-3 text-stone-500">{fmt(v.generated_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(v.id, e.target.value as Status)}
                        className={`rounded-md px-2 py-1 text-xs font-medium border-0 outline-none cursor-pointer ${
                          status ? STATUS_COLORS[status] : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        <option value="">— no application —</option>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {v.job_url && (
                          <a
                            href={v.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-400 hover:text-stone-600 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <a
                          href={v.pdf_path}
                          download
                          className="text-stone-400 hover:text-stone-700 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
