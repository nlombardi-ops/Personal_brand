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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Monthly Cost Breakdown</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis
              dataKey="month"
              tick={{ fill: "#737373", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#262626" }}
            />
            <YAxis
              tick={{ fill: "#737373", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}€`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#171717",
                border: "1px solid #262626",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#a3a3a3" }}
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
