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
} from "recharts";

interface YearData {
  year: number;
  interest: number;
  principal_paid: number;
  balance: number;
}

export default function AmortizationChart({ data, fixedEndYear }: { data: YearData[]; fixedEndYear: number }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Amortization Schedule — Principal vs Interest</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="year"
              tick={{ fill: "#737373", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#262626" }}
              label={{ value: "Year", position: "insideBottom", offset: -5, fill: "#525252", fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "#737373", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#171717",
                border: "1px solid #262626",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#a3a3a3" }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString("es-ES", { minimumFractionDigits: 2 })}€`,
                name === "interest" ? "Interest" : "Principal",
              ]}
              labelFormatter={(year) => `Year ${year}`}
            />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} iconType="circle" iconSize={8} />
            <ReferenceLine
              x={fixedEndYear}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: "Variable rate starts", fill: "#f59e0b", fontSize: 10, position: "top" }}
            />
            <Bar dataKey="principal_paid" stackId="a" fill="#10b981" name="Principal" />
            <Bar dataKey="interest" stackId="a" fill="#ef4444" name="Interest" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
