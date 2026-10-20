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
      <div className="flex h-56 items-center justify-center text-sm text-zinc-500">
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
            <XAxis
              dataKey="label"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#3f3f46" }}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as (typeof formattedData)[0];
                  return (
                    <div className="glace-modal p-3 rounded-xl border border-white/10 text-xs space-y-1 shadow-2xl">
                      <div className="font-semibold text-zinc-300">
                        {item.dateLabel} {item.label}
                      </div>
                      <div
                        className={`font-bold text-sm ${
                          item.uptimePct >= 99
                            ? "text-emerald-400"
                            : item.uptimePct >= 95
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        Uptime: {item.uptimePct}%
                      </div>
                      <div className="text-zinc-500 text-[11px]">
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
                      ? "rgba(34, 197, 94, 0.75)"
                      : entry.uptimePct >= 95
                      ? "rgba(245, 158, 11, 0.75)"
                      : "rgba(239, 68, 68, 0.75)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {formattedData.length === 1 && (
        <p className="text-[11px] text-zinc-500 text-center pt-2">
          1 data point recorded. Click <strong>"Test Ping Now"</strong> above to record more pings immediately.
        </p>
      )}
    </div>
  );
}
