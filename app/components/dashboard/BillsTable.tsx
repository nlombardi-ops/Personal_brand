"use client";

interface BillRow {
  month: string;
  energy: number;
  community: number;
  water: number;
  internet: number;
  total: number;
}

function fmt(n: number) {
  if (n === 0) return "—";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export default function BillsTable({ rows }: { rows: BillRow[] }) {
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500">Month</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-amber-500">Energy</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-emerald-500">Community</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-cyan-500">Water</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-indigo-500">Internet</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
              <td className="px-4 py-3 font-medium text-neutral-300">{row.month}</td>
              <td className="px-4 py-3 text-right text-amber-400">{fmt(row.energy)}</td>
              <td className="px-4 py-3 text-right text-emerald-400">{fmt(row.community)}</td>
              <td className="px-4 py-3 text-right text-cyan-400">{fmt(row.water)}</td>
              <td className="px-4 py-3 text-right text-indigo-400">{fmt(row.internet)}</td>
              <td className="px-4 py-3 text-right font-bold text-white">{fmt(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-neutral-800/50">
            <td className="px-4 py-3 font-bold text-white">TOTAL</td>
            <td className="px-4 py-3 text-right font-bold text-amber-400">
              {fmt(rows.reduce((s, r) => s + r.energy, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-emerald-400">
              {fmt(rows.reduce((s, r) => s + r.community, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-cyan-400">
              {fmt(rows.reduce((s, r) => s + r.water, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-indigo-400">
              {fmt(rows.reduce((s, r) => s + r.internet, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-white">{fmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
