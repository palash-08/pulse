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
import { useTheme } from "../../context/ThemeContext.js";

interface UptimeChartProps {
  data: ChartBucket[];
}

export function UptimeChart({ data }: UptimeChartProps) {
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-neutral-400 dark:text-neutral-500">
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

  const gridColor = isDark ? "#262626" : "#f0f0f0";
  const axisColor = isDark ? "#737373" : "#a3a3a3";
  const axisLineColor = isDark ? "#333333" : "#e5e5e5";

  return (
    <div className="h-64 w-full pt-2 flex flex-col justify-between">
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="label"
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: axisLineColor }}
            />
            <YAxis
              stroke={axisColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: axisLineColor }}
              domain={[0, 100]}
              unit="%"
              width={50}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as (typeof formattedData)[0];
                  return (
                    <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-md text-xs space-y-1 transition-colors">
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {item.dateLabel} {item.label}
                      </div>
                      <div
                        className={`font-bold text-sm ${
                          item.uptimePct >= 99
                            ? "text-emerald-600 dark:text-emerald-400"
                            : item.uptimePct >= 95
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        Uptime: {item.uptimePct}%
                      </div>
                      <div className="text-neutral-500 dark:text-neutral-400 text-[11px]">
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
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 text-center pt-2">
          1 bucket recorded. Uptime bars will form as additional checks are recorded.
        </p>
      )}
    </div>
  );
}
