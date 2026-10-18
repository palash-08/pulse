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
    <div className="h-64 w-full pt-2 flex flex-col justify-between">
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              stroke="#a3a3a3"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e5e5e5" }}
            />
            <YAxis
              stroke="#a3a3a3"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e5e5e5" }}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as (typeof formattedData)[0];
                  return (
                    <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-md text-xs space-y-1">
                      <div className="font-semibold text-neutral-800">
                        {item.dateLabel} {item.label}
                      </div>
                      <div
                        className={`font-bold text-sm ${
                          item.uptimePct >= 99
                            ? "text-emerald-600"
                            : item.uptimePct >= 95
                            ? "text-amber-600"
                            : "text-rose-600"
                        }`}
                      >
                        Uptime: {item.uptimePct}%
                      </div>
                      <div className="text-neutral-500 text-[11px]">
                        Checks: {item.checks} &bull; Failures: {item.failures}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="uptimePct" minPointSize={6} radius={[4, 4, 0, 0]}>
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

      {formattedData.length === 1 && (
        <p className="text-[11px] text-neutral-400 text-center pt-2">
          1 bucket recorded. Uptime bars will form as additional checks are recorded.
        </p>
      )}
    </div>
  );
}
