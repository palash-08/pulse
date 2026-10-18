import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartBucket } from "../../api/types.js";

interface ResponseTimeChartProps {
  data: ChartBucket[];
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        No response time data available for this range
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
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="responseTimeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
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
            unit="ms"
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
                    <div className="text-blue-600 font-medium mt-1">
                      Average: {item.avgMs} ms
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Min: {item.minMs} ms | Max: {item.maxMs} ms
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      Checks: {item.checks} ({item.failures} failures)
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="avgMs"
            stroke="#2563eb"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#responseTimeGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
