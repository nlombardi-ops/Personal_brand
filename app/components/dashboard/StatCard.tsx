import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color?: string;
  trend?: { value: number; label: string };
}

export default function StatCard({ label, value, sub, icon: Icon, color = "bg-stone-100", trend }: StatCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trend.value >= 0 ? "text-red-500" : "text-emerald-600"}`}>
              {trend.value >= 0 ? "+" : ""}{trend.value.toFixed(1)}% {trend.label}
            </p>
          )}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-stone-600" />
        </div>
      </div>
    </div>
  );
}
