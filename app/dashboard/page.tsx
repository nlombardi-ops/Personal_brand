import { Zap, Landmark, Calendar, AlertTriangle, Wifi, ShieldCheck } from "lucide-react";
import AuthGuard from "../components/dashboard/AuthGuard";
import StatCard from "../components/dashboard/StatCard";
import CostChart from "../components/dashboard/CostChart";
import SyncButton from "../components/dashboard/SyncButton";
import rawBills from "../../data/bills.json";
import rawInsurance from "../../data/insurance.json";
import rawContracts from "../../data/contracts.json";
import rawMortgage from "../../data/mortgage.json";
import type { BillsData, InsurancePolicy, Contract, MortgageData } from "@/lib/types";

const billsData = rawBills as BillsData;
const policies = rawInsurance.policies as InsurancePolicy[];
const contracts = rawContracts.contracts as Contract[];
const mortgage = rawMortgage as MortgageData;

function buildMonthlyData() {
  const months = new Set<string>();
  billsData.energy.forEach((b) => months.add(b.month));
  billsData.community.forEach((b) => months.add(b.month));

  return Array.from(months)
    .sort()
    .map((month) => {
      const energy = billsData.energy.find((b) => b.month === month)?.total || 0;
      const comm = billsData.community.find((b) => b.month === month);
      const community = comm ? comm.cuota + comm.water + comm.extraordinary : 0;
      const inet = billsData.internet.find((b) => b.month === month);
      const internet = inet?.total || 0;
      return { month, energy, community, internet, total: energy + community + internet };
    });
}

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function latestMonth(entries: Array<{ month: string }>) {
  if (!entries.length) return null;
  return entries.map((e) => e.month).sort().at(-1)!;
}

function nextFirstOfMonth() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function DashboardOverview() {
  const monthly = buildMonthlyData();
  const latest = monthly[monthly.length - 1];
  const prev = monthly.length > 1 ? monthly[monthly.length - 2] : null;

  // ── Fixed costs
  const mortgageMonthly = mortgage.monthly_payment_bonified;
  const insuranceMonthly = policies.reduce((s, p) => s + p.monthly_cost, 0);

  // ── Latest variable bills
  const latestEnergy = [...billsData.energy].sort((a, b) => a.month.localeCompare(b.month)).at(-1);
  const latestInternet = [...billsData.internet].sort((a, b) => a.month.localeCompare(b.month)).at(-1);
  const latestCommunity = [...billsData.community].sort((a, b) => a.month.localeCompare(b.month)).at(-1);

  const energyAmt = latestEnergy?.total || 0;
  const internetAmt = latestInternet?.total || 0;
  const communityAmt = latestCommunity
    ? latestCommunity.cuota + latestCommunity.water + latestCommunity.extraordinary
    : 0;

  // ── All-in total
  const allInTotal = mortgageMonthly + insuranceMonthly + energyAmt + internetAmt + communityAmt;

  const categories = [
    { label: "Mortgage", value: mortgageMonthly, color: "bg-red-400", note: `${mortgage.lender} · bonified rate` },
    { label: "Insurance", value: insuranceMonthly, color: "bg-purple-400", note: `${policies.filter(p => p.monthly_cost > 0).map(p => p.name).join(" · ")}` },
    { label: "Energy", value: energyAmt, color: "bg-amber-400", note: latestEnergy ? `${latestEnergy.provider} · ${latestEnergy.month}` : "no data" },
    { label: "Community & Water", value: communityAmt, color: "bg-teal-400", note: latestCommunity ? `cuota + agua · ${latestCommunity.month}` : "no data" },
    { label: "Internet & Phone", value: internetAmt, color: "bg-blue-400", note: latestInternet ? `${latestInternet.provider} · ${latestInternet.month}` : "no data" },
  ];

  // ── Trend for stats
  const latestTotal = latest?.total || 0;
  const prevTotal = prev?.total || latestTotal;
  const trendPct = prevTotal ? ((latestTotal - prevTotal) / prevTotal) * 100 : 0;
  const avgEnergy = billsData.energy.reduce((s, b) => s + b.total, 0) / (billsData.energy.length || 1);

  const communityLatest = latestMonth(billsData.community);
  const energyLatest = latestMonth(billsData.energy);
  const internetLatest = latestMonth(billsData.internet);

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Overview</h1>
            <p className="text-sm text-stone-500">Casa Fourquet 10 — all monthly costs</p>
          </div>
          <SyncButton
            communityLatest={communityLatest}
            energyLatest={energyLatest}
            internetLatest={internetLatest}
            nextSync={nextFirstOfMonth()}
          />
        </div>

        {/* ── All-in breakdown ── */}
        <div className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Total Monthly Cost</p>
              <p className="mt-0.5 text-3xl font-bold text-stone-900">{fmt(allInTotal)}</p>
            </div>
            <p className="text-xs text-stone-400">Fixed + variable · current month</p>
          </div>

          <div className="space-y-3">
            {categories.map((cat) => {
              const pct = allInTotal > 0 ? (cat.value / allInTotal) * 100 : 0;
              return (
                <div key={cat.label} className="flex items-center gap-3">
                  <div className="w-32 flex-shrink-0 text-sm font-medium text-stone-700">{cat.label}</div>
                  <div className="flex-1 relative">
                    <div className="h-2 w-full rounded-full bg-stone-100">
                      <div
                        className={`h-2 rounded-full ${cat.color} transition-all`}
                        style={{ width: `${Math.max(pct, 0.5)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm font-semibold text-stone-900">
                    {fmt(cat.value)}
                  </div>
                  <div className="w-10 text-right text-xs text-stone-400">
                    {pct.toFixed(0)}%
                  </div>
                  <div className="w-52 text-xs text-stone-400 truncate hidden xl:block">
                    {cat.note}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stacked colour bar */}
          <div className="mt-5 flex h-1.5 w-full overflow-hidden rounded-full">
            {categories.map((cat) => (
              <div
                key={cat.label}
                className={`h-full ${cat.color}`}
                style={{ width: `${allInTotal > 0 ? (cat.value / allInTotal) * 100 : 0}%` }}
              />
            ))}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Mortgage"
            value={fmt(mortgageMonthly)}
            sub={`Standard: ${fmt(mortgage.monthly_payment)}`}
            icon={Landmark}
            color="bg-red-50"
          />
          <StatCard
            label="Insurance"
            value={fmt(insuranceMonthly)}
            sub={`${policies.filter(p => p.monthly_cost > 0).length} policies · Hogar + Vida`}
            icon={ShieldCheck}
            color="bg-purple-50"
          />
          <StatCard
            label="Latest Variable Bills"
            value={fmt(latestTotal)}
            sub={latest?.month}
            icon={Calendar}
            color="bg-blue-50"
            trend={{ value: trendPct, label: "vs prev" }}
          />
          <StatCard
            label="Avg. Energy"
            value={fmt(avgEnergy)}
            sub={`${billsData.energy.length} bills · Endesa`}
            icon={Zap}
            color="bg-amber-50"
          />
        </div>

        {/* ── Chart ── */}
        <CostChart data={monthly} />

        {/* ── Details grid ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent energy */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <h3 className="text-sm font-semibold text-stone-900">Recent Energy</h3>
            </div>
            <div className="space-y-0">
              {[...billsData.energy].sort((a, b) => a.month.localeCompare(b.month)).slice(-5).reverse().map((bill) => (
                <div key={bill.month} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                  <span className="text-sm text-stone-500">{bill.month}</span>
                  <span className="text-sm font-medium text-stone-900">{fmt(bill.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Internet */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="h-3.5 w-3.5 text-blue-500" />
              <h3 className="text-sm font-semibold text-stone-900">Internet & Phone</h3>
            </div>
            <div className="space-y-0">
              {[...billsData.internet].sort((a, b) => a.month.localeCompare(b.month)).slice(-5).reverse().map((bill) => (
                <div key={bill.month} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                  <span className="text-sm text-stone-500">{bill.month}</span>
                  <span className="text-sm font-medium text-stone-900">{fmt(bill.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insurance */}
          <div className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
              <h3 className="text-sm font-semibold text-stone-900">Insurance</h3>
            </div>
            <div className="space-y-0">
              {policies.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                  <div>
                    <p className="text-sm text-stone-900">{p.name}</p>
                    <p className="text-xs text-stone-500">{p.provider}</p>
                  </div>
                  <span className="text-sm font-medium text-stone-900">
                    {p.monthly_cost > 0 ? fmt(p.monthly_cost) : <span className="text-xs text-stone-400">included</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Contract status ── */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-stone-500" />
            <h3 className="text-sm font-semibold text-stone-900">Contract Status</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0 sm:last:border-0">
                <div>
                  <p className="text-sm text-stone-900">{c.name}</p>
                  <p className="text-xs text-stone-500">{c.provider}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.permanencia_end
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {c.permanencia_end ? `Until ${c.permanencia_end}` : "Free"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
