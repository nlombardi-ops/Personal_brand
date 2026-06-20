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
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-stone-900">Monthly Cost Trend</h3>
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
