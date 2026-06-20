import { Zap, Building2, Landmark, TrendingDown, Calendar, AlertTriangle, RefreshCw } from "lucide-react";
import AuthGuard from "../components/dashboard/AuthGuard";
import StatCard from "../components/dashboard/StatCard";
import CostChart from "../components/dashboard/CostChart";
import rawBills from "../../data/bills.json";
import rawInsurance from "../../data/insurance.json";
import rawContracts from "../../data/contracts.json";
import rawMortgage from "../../data/mortgage.json";
import type { BillsData, InsurancePolicy, Contract, MortgageData } from "../lib/types";

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

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
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

  const totalEnergy = billsData.energy.reduce((s, b) => s + b.total, 0);
  const avgEnergy = totalEnergy / billsData.energy.length;
  const totalCommunity = billsData.community.reduce((s, b) => s + b.cuota + b.water + b.extraordinary, 0);
  const avgCommunity = totalCommunity / billsData.community.length;

  const latestTotal = latest?.total || 0;
  const prevTotal = prev?.total || latestTotal;
  const trendPct = prevTotal ? ((latestTotal - prevTotal) / prevTotal) * 100 : 0;

  const activeContracts = contracts.filter((c) => c.status === "active");

  const communityLatest = latestMonth(billsData.community);
  const energyLatest = latestMonth(billsData.energy);
  const internetLatest = latestMonth(billsData.internet);

  return (
    <AuthGuard>
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Overview</h1>
          <p className="text-sm text-stone-500">
            Casa Fourquet 10 — monthly costs and contract status
          </p>
        </div>

        {/* Sync status pill */}
        <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs">
          <RefreshCw className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" />
          <div className="space-y-0.5">
            <div className="flex gap-3 text-stone-600">
              <span>Community <span className="font-medium text-stone-900">{communityLatest ? fmtMonth(communityLatest) : "—"}</span></span>
              <span>Energy <span className="font-medium text-stone-900">{energyLatest ? fmtMonth(energyLatest) : "—"}</span></span>
              <span>Internet <span className="font-medium text-stone-900">{internetLatest ? fmtMonth(internetLatest) : "—"}</span></span>
            </div>
            <p className="text-stone-400">Next sync: <span className="text-stone-600">{nextFirstOfMonth()}</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Mortgage"
          value={fmt(mortgage.monthly_payment)}
          sub={`Bonified: ${fmt(mortgage.monthly_payment_bonified)}`}
          icon={Landmark}
          color="bg-red-50"
        />
        <StatCard
          label="Latest Bills"
          value={fmt(latestTotal)}
          sub={latest?.month}
          icon={Calendar}
          color="bg-blue-50"
          trend={{ value: trendPct, label: "vs prev" }}
        />
        <StatCard
          label="Avg. Energy"
          value={fmt(avgEnergy)}
          sub={`${billsData.energy.length} bills`}
          icon={Zap}
          color="bg-amber-50"
        />
        <StatCard
          label="Active Contracts"
          value={`${activeContracts.length}`}
          sub={`${policies.length} insurance policies`}
          icon={AlertTriangle}
          color="bg-purple-50"
        />
      </div>

      <CostChart data={monthly} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-stone-900">Recent Energy Bills</h3>
          <div className="space-y-0">
            {billsData.energy
              .slice(-5)
              .reverse()
              .map((bill) => (
                <div key={bill.month} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                  <span className="text-sm text-stone-500">{bill.month}</span>
                  <span className="text-sm font-medium text-stone-900">{fmt(bill.total)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-stone-900">Contract Status</h3>
          <div className="space-y-0">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
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
    </div>
    </AuthGuard>
  );
}
