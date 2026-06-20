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
} from "recharts";

interface MonthlyData {
  month: string;
  energy: number;
  community: number;
  water: number;
  internet: number;
}

export default function StackedBarChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-stone-900">Monthly Cost Breakdown</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
            <XAxis
              dataKey="month"
              tick={{ fill: "#78716c", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#e7e5e4" }}
            />
            <YAxis
              tick={{ fill: "#78716c", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}€`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e7e5e4",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#57534e" }}
              formatter={(value: number) => [`${value.toFixed(2)}€`]}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              iconType="circle"
              iconSize={8}
            />
            <Bar dataKey="energy" stackId="a" fill="#f59e0b" name="Energy" radius={[0, 0, 0, 0]} />
            <Bar dataKey="community" stackId="a" fill="#10b981" name="Community" />
            <Bar dataKey="water" stackId="a" fill="#06b6d4" name="Water" />
            <Bar dataKey="internet" stackId="a" fill="#6366f1" name="Internet" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
