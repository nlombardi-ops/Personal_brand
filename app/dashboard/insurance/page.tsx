import { Shield, Heart, Home, Bike, Calendar, AlertCircle, ExternalLink } from "lucide-react";
import AuthGuard from "../../components/dashboard/AuthGuard";
import rawInsurance from "../../../data/insurance.json";
import rawRates from "../../../data/rates.json";
import type { InsurancePolicy, RatesData } from "@/lib/types";

const ratesData = rawRates as RatesData;

const TYPE_CONFIG: Record<string, { icon: typeof Shield; color: string; bgColor: string }> = {
  health: { icon: Heart, color: "text-rose-400", bgColor: "bg-rose-900/50" },
  home: { icon: Home, color: "text-amber-400", bgColor: "bg-amber-900/50" },
  life: { icon: Shield, color: "text-blue-400", bgColor: "bg-blue-900/50" },
  bike: { icon: Bike, color: "text-emerald-400", bgColor: "bg-emerald-900/50" },
};

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function getPermanenciaStatus(end: string | null): { label: string; color: string } {
  if (!end) return { label: "No permanencia", color: "bg-emerald-900/50 text-emerald-300" };

  const endDate = new Date(end);
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return { label: "Free", color: "bg-emerald-900/50 text-emerald-300" };
  if (daysLeft <= 90) return { label: `${daysLeft}d left`, color: "bg-amber-900/50 text-amber-300" };
  return { label: `Until ${end}`, color: "bg-red-900/50 text-red-300" };
}

export default function InsurancePage() {
  const policies = rawInsurance.policies as InsurancePolicy[];
  const totalMonthly = policies.reduce((s, p) => s + (p.monthly_cost || 0), 0);
  const totalAnnual = policies.reduce((s, p) => s + (p.annual_cost || 0), 0);

  return (
    <AuthGuard>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Insurance</h1>
        <p className="text-sm text-neutral-500">
          All active policies — coverage, costs & market comparison
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Monthly Cost</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalMonthly > 0 ? fmt(totalMonthly) : "Included"}</p>
          <p className="text-xs text-neutral-500">{policies.length} active policies</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Annual Cost</p>
          <p className="mt-1 text-2xl font-bold text-white">{totalAnnual > 0 ? fmt(totalAnnual) : "Included"}</p>
          <p className="text-xs text-neutral-500">across all policies</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Market Offers</p>
          <p className="mt-1 text-2xl font-bold text-white">{ratesData.insurance_offers.length || "Pending"}</p>
          <p className="text-xs text-neutral-500">
            {ratesData.last_updated ? `Last scraped ${ratesData.last_updated}` : "Scraper not yet configured"}
          </p>
        </div>
      </div>

      {/* Policy Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {policies.map((policy) => {
          const typeConf = TYPE_CONFIG[policy.type] || TYPE_CONFIG.home;
          const Icon = typeConf.icon;
          const perm = getPermanenciaStatus(policy.permanencia_end);

          return (
            <div key={policy.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeConf.bgColor}`}>
                    <Icon className={`h-5 w-5 ${typeConf.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{policy.name}</h3>
                    <p className="text-xs text-neutral-500">{policy.provider}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${perm.color}`}>
                  {perm.label}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-neutral-500">Monthly</p>
                  <p className="text-sm font-semibold text-white">
                    {policy.monthly_cost > 0 ? fmt(policy.monthly_cost) : policy.included_in ? `Included` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Annual</p>
                  <p className="text-sm font-semibold text-white">
                    {policy.annual_cost > 0 ? fmt(policy.annual_cost) : policy.annual_limit ? `Limit ${fmt(policy.annual_limit)}` : "—"}
                  </p>
                </div>
              </div>

              {policy.coverage && policy.coverage.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-neutral-500 mb-2">Coverage</p>
                  <div className="flex flex-wrap gap-1.5">
                    {policy.coverage.map((item) => (
                      <span key={item} className="inline-flex rounded-md bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {policy.notes && (
                <p className="mt-3 text-xs text-neutral-600">{policy.notes}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Market comparison placeholder */}
      <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50 p-8 text-center">
        <ExternalLink className="mx-auto h-8 w-8 text-neutral-700" />
        <p className="mt-2 text-sm text-neutral-500">Market Comparison</p>
        <p className="text-xs text-neutral-600">
          Insurance market offers will appear here once the monthly scraper is configured.
          Sources: Rastreator, Acierto, direct insurers.
        </p>
      </div>
    </div>
    </AuthGuard>
  );
}
