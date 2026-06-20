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
    <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-100 text-left">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-stone-600">Month</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-amber-600">Energy</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-emerald-600">Community</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-cyan-600">Water</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-indigo-600">Internet</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
              <td className="px-4 py-3 font-medium text-stone-700">{row.month}</td>
              <td className="px-4 py-3 text-right text-amber-600">{fmt(row.energy)}</td>
              <td className="px-4 py-3 text-right text-emerald-600">{fmt(row.community)}</td>
              <td className="px-4 py-3 text-right text-cyan-600">{fmt(row.water)}</td>
              <td className="px-4 py-3 text-right text-indigo-600">{fmt(row.internet)}</td>
              <td className="px-4 py-3 text-right font-bold text-stone-900">{fmt(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-stone-100">
            <td className="px-4 py-3 font-bold text-stone-900">TOTAL</td>
            <td className="px-4 py-3 text-right font-bold text-amber-600">
              {fmt(rows.reduce((s, r) => s + r.energy, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-emerald-600">
              {fmt(rows.reduce((s, r) => s + r.community, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-cyan-600">
              {fmt(rows.reduce((s, r) => s + r.water, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-indigo-600">
              {fmt(rows.reduce((s, r) => s + r.internet, 0))}
            </td>
            <td className="px-4 py-3 text-right font-bold text-stone-900">{fmt(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
