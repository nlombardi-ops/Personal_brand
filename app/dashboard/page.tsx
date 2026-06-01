import { Zap, Building2, Landmark, TrendingDown, Calendar, AlertTriangle } from "lucide-react";
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

  return (
    <AuthGuard>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-neutral-500">
          Casa Fourquet 10 — monthly costs and contract status
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Mortgage"
          value={fmt(mortgage.monthly_payment)}
          sub={`Bonified: ${fmt(mortgage.monthly_payment_bonified)}`}
          icon={Landmark}
          color="bg-red-900/50"
        />
        <StatCard
          label="Latest Bills"
          value={fmt(latestTotal)}
          sub={latest?.month}
          icon={Calendar}
          color="bg-blue-900/50"
          trend={{ value: trendPct, label: "vs prev" }}
        />
        <StatCard
          label="Avg. Energy"
          value={fmt(avgEnergy)}
          sub={`${billsData.energy.length} bills`}
          icon={Zap}
          color="bg-amber-900/50"
        />
        <StatCard
          label="Active Contracts"
          value={`${activeContracts.length}`}
          sub={`${policies.length} insurance policies`}
          icon={AlertTriangle}
          color="bg-purple-900/50"
        />
      </div>

      <CostChart data={monthly} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Recent Energy Bills</h3>
          <div className="space-y-2">
            {billsData.energy
              .slice(-5)
              .reverse()
              .map((bill) => (
                <div key={bill.month} className="flex items-center justify-between py-1.5 border-b border-neutral-800 last:border-0">
                  <span className="text-sm text-neutral-400">{bill.month}</span>
                  <span className="text-sm font-medium text-white">{fmt(bill.total)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Contract Status</h3>
          <div className="space-y-2">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-neutral-800 last:border-0">
                <div>
                  <p className="text-sm text-white">{c.name}</p>
                  <p className="text-xs text-neutral-500">{c.provider}</p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.permanencia_end
                      ? "bg-red-900/50 text-red-300"
                      : "bg-emerald-900/50 text-emerald-300"
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
