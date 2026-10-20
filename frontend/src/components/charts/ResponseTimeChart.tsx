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
      <div className="flex h-56 items-center justify-center text-sm text-zinc-500">
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
    <div className="h-64 w-full pt-2 flex flex-col justify-between">
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="responseTimeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
              </linearGradient>
            </defs>
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
              unit="ms"
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
                      <div className="text-zinc-100 font-bold text-sm">
                        {item.avgMs} ms <span className="text-[11px] font-normal text-zinc-400">(Avg)</span>
                      </div>
                      <div className="text-zinc-400 text-[11px]">
                        Min: {item.minMs} ms &bull; Max: {item.maxMs} ms
                      </div>
                      <div className="text-zinc-500 text-[11px]">
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
              stroke="#f4f4f5"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1.5, fill: "#08080a", stroke: "#f4f4f5" }}
              activeDot={{ r: 5, fill: "#ffffff", stroke: "#08080a", strokeWidth: 2 }}
              fillOpacity={1}
              fill="url(#responseTimeGrad)"
            />
          </AreaChart>
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
