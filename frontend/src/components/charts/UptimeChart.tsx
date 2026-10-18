import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { ChartBucket } from "../../api/types.js";

interface UptimeChartProps {
  data: ChartBucket[];
}

export function UptimeChart({ data }: UptimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        No uptime data available for this range
      </div>
    );
  }

  const formattedData = data.map((d) => {
    const date = new Date(d.bucketStart);
    return {
      ...d,
      label: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      dateLabel: date.toLocaleDateString([], { month: "short", day: "numeric" }),
    };
  });

  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            domain={[0, 100]}
            unit="%"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as (typeof formattedData)[0];
                return (
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-xs">
                    <div className="font-semibold text-slate-700">
                      {item.dateLabel} {item.label}
                    </div>
                    <div
                      className={`font-medium mt-1 ${
                        item.uptimePct >= 99
                          ? "text-emerald-600"
                          : item.uptimePct >= 95
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                    >
                      Uptime: {item.uptimePct}%
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Checks: {item.checks} | Failures: {item.failures}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="uptimePct" radius={[3, 3, 0, 0]}>
            {formattedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.uptimePct >= 99
                    ? "#10b981"
                    : entry.uptimePct >= 95
                    ? "#f59e0b"
                    : "#ef4444"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
