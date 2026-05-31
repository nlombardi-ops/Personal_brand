"use client";

import {
  AreaChart,
  Area,
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
  internet: number;
  total: number;
}

export default function CostChart({ data }: { data: MonthlyData[] }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Monthly Cost Trend</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gEnergy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCommunity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gInternet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
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
            <Area
              type="monotone"
              dataKey="energy"
              stroke="#f59e0b"
              fill="url(#gEnergy)"
              strokeWidth={2}
              name="Energy"
            />
            <Area
              type="monotone"
              dataKey="community"
              stroke="#10b981"
              fill="url(#gCommunity)"
              strokeWidth={2}
              name="Community"
            />
            <Area
              type="monotone"
              dataKey="internet"
              stroke="#6366f1"
              fill="url(#gInternet)"
              strokeWidth={2}
              name="Internet"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
