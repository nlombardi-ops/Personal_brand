import { readFileSync } from "fs";
import { join } from "path";
import { FileText, Send, TrendingUp, Handshake, Ghost } from "lucide-react";

function read<T>(file: string): T[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), file), "utf-8"));
  } catch {
    return [];
  }
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100">
          <Icon className="h-4 w-4 text-stone-600" />
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const versions = read<{ id: string }>("data/cv-versions.json");
  const apps = read<{ status: string }>("data/applications.json");

  const total = apps.length;
  const interviews = apps.filter((a) =>
    ["interview_1", "interview_2", "offer"].includes(a.status)
  ).length;
  const offers = apps.filter((a) => a.status === "offer").length;
  const ghosted = apps.filter((a) => a.status === "ghosted").length;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-lg font-semibold text-stone-900 mb-1">Stats</h1>
      <p className="text-sm text-stone-500 mb-6">Your application pipeline at a glance</p>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="CVs Generated" value={String(versions.length)} icon={FileText} />
        <StatCard label="Applications Submitted" value={String(total)} icon={Send} />
        <StatCard
          label="Interview Rate"
          value={`${total > 0 ? Math.round((interviews / total) * 100) : 0}%`}
          sub="of applications reached interview stage"
          icon={TrendingUp}
        />
        <StatCard
          label="Offer Rate"
          value={`${total > 0 ? Math.round((offers / total) * 100) : 0}%`}
          sub="of applications led to an offer"
          icon={Handshake}
        />
        <StatCard label="Ghosted" value={String(ghosted)} icon={Ghost} />
      </div>
    </div>
  );
}
