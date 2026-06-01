import { Zap, Building2, Droplets, Wifi } from "lucide-react";
import AuthGuard from "../../components/dashboard/AuthGuard";
import StatCard from "../../components/dashboard/StatCard";
import BillsTable from "../../components/dashboard/BillsTable";
import StackedBarChart from "../../components/dashboard/StackedBarChart";
import rawBills from "../../../data/bills.json";
import type { BillsData } from "../../lib/types";

const billsData = rawBills as BillsData;

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function buildRows() {
  const months = new Set<string>();
  billsData.energy.forEach((b) => months.add(b.month));
  billsData.community.forEach((b) => months.add(b.month));
  billsData.internet.forEach((b) => months.add(b.month));

  return Array.from(months)
    .sort()
    .map((month) => {
      const energy = billsData.energy.find((b) => b.month === month)?.total || 0;
      const comm = billsData.community.find((b) => b.month === month);
      const community = comm?.cuota || 0;
      const water = comm?.water || 0;
      const internet = billsData.internet.find((b) => b.month === month)?.total || 0;
      return { month, energy, community, water, internet, total: energy + community + water + internet };
    });
}

export default function BillsPage() {
  const rows = buildRows();

  const totalEnergy = billsData.energy.reduce((s, b) => s + b.total, 0);
  const avgEnergy = billsData.energy.length ? totalEnergy / billsData.energy.length : 0;

  const totalCommunity = billsData.community.reduce((s, b) => s + b.cuota, 0);
  const avgCommunity = billsData.community.length ? totalCommunity / billsData.community.length : 0;

  const totalWater = billsData.community.reduce((s, b) => s + b.water, 0);
  const avgWater = billsData.community.length ? totalWater / billsData.community.length : 0;

  const lastEnergy = billsData.energy[billsData.energy.length - 1]?.total || 0;
  const prevEnergy = billsData.energy.length > 1 ? billsData.energy[billsData.energy.length - 2]?.total || 0 : lastEnergy;
  const energyTrend = prevEnergy ? ((lastEnergy - prevEnergy) / prevEnergy) * 100 : 0;

  return (
    <AuthGuard>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bills</h1>
        <p className="text-sm text-neutral-500">
          Energy, community, water & internet — monthly breakdown
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Avg. Energy"
          value={fmt(avgEnergy)}
          sub={`${billsData.energy.length} months`}
          icon={Zap}
          color="bg-amber-900/50"
          trend={{ value: energyTrend, label: "last month" }}
        />
        <StatCard
          label="Avg. Community"
          value={fmt(avgCommunity)}
          sub="monthly cuota"
          icon={Building2}
          color="bg-emerald-900/50"
        />
        <StatCard
          label="Avg. Water"
          value={fmt(avgWater)}
          sub="quarterly, distributed"
          icon={Droplets}
          color="bg-cyan-900/50"
        />
        <StatCard
          label="Internet"
          value={billsData.internet.length ? fmt(billsData.internet[0].total) : "Pending"}
          sub="Pepephone"
          icon={Wifi}
          color="bg-indigo-900/50"
        />
      </div>

      <StackedBarChart
        data={rows.map((r) => ({
          month: r.month,
          energy: r.energy,
          community: r.community,
          water: r.water,
          internet: r.internet,
        }))}
      />

      <BillsTable rows={rows} />

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Energy Bill Detail</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left">
                <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-neutral-500">Month</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Potencia</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Consumo</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">IVA</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {billsData.energy.map((bill) => (
                <tr key={bill.month} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-3 py-2 text-neutral-300">{bill.month}</td>
                  <td className="px-3 py-2 text-right text-neutral-400">{fmt(bill.potencia)}</td>
                  <td className="px-3 py-2 text-right text-neutral-400">{fmt(bill.consumo)}</td>
                  <td className="px-3 py-2 text-right text-neutral-400">{fmt(bill.iva)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-amber-400">{fmt(bill.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
