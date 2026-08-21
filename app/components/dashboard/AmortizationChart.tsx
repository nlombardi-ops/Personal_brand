"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from "recharts";

interface YearData {
  year: number;
  interest: number;
  principal_paid: number;
  balance: number;
}

interface AmortizationChartProps {
  data: YearData[];
  fixedEndYear: number;
  fixedRateLabel: string;
  variableRateLabel: string;
}

export default function AmortizationChart({ data, fixedEndYear, fixedRateLabel, variableRateLabel }: AmortizationChartProps) {
  const lastYear = data[data.length - 1]?.year ?? fixedEndYear;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-stone-900">Amortization Schedule — Principal vs Interest</h3>
      <p className="mt-1 mb-4 text-xs text-stone-500">
        Interest jumps at year {fixedEndYear + 1} because the rate resets from {fixedRateLabel} (fixed) to{" "}
        {variableRateLabel} (variable) — the payment recalculates over the remaining balance at the new, higher rate,
        so more of each euro goes to interest and less to principal.
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <ReferenceArea x1={data[0]?.year} x2={fixedEndYear} fill="#f59e0b" fillOpacity={0.06} ifOverflow="extendDomain" />
            <ReferenceArea x1={fixedEndYear} x2={lastYear} fill="#3b82f6" fillOpacity={0.06} ifOverflow="extendDomain" />
            <XAxis
              dataKey="year"
              tick={{ fill: "#78716c", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e7e5e4" }}
              label={{ value: "Year", position: "insideBottom", offset: -5, fill: "#78716c", fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "#78716c", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e7e5e4",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#57534e" }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€`,
                name === "interest" ? "Interest" : "Principal",
              ]}
              labelFormatter={(year) =>
                `Year ${year}${Number(year) <= fixedEndYear ? ` · Fixed ${fixedRateLabel}` : ` · Variable ${variableRateLabel}`}`
              }
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} iconType="circle" iconSize={8} />
            <ReferenceLine
              x={fixedEndYear}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: `Variable rate starts (${variableRateLabel})`, fill: "#f59e0b", fontSize: 10, position: "top" }}
            />
            <Bar dataKey="principal_paid" stackId="a" fill="#10b981" name="Principal" />
            <Bar dataKey="interest" stackId="a" fill="#ef4444" name="Interest" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-stone-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400/60" /> Fixed period ({fixedRateLabel})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400/60" /> Variable period ({variableRateLabel})
        </span>
      </div>
    </div>
  );
}
