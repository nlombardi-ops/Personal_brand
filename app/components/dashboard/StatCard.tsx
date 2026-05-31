import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color?: string;
  trend?: { value: number; label: string };
}

export default function StatCard({ label, value, sub, icon: Icon, color = "bg-neutral-800", trend }: StatCardProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>}
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trend.value >= 0 ? "text-red-400" : "text-emerald-400"}`}>
              {trend.value >= 0 ? "+" : ""}{trend.value.toFixed(1)}% {trend.label}
            </p>
          )}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-neutral-300" />
        </div>
      </div>
    </div>
  );
}
