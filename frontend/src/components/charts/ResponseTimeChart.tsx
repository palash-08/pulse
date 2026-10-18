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
    <div className="h-64 w-full pt-2 flex flex-col justify-between">
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="responseTimeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
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
              unit="ms"
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
                      <div className="text-neutral-900 font-bold text-sm">
                        {item.avgMs} ms <span className="text-[11px] font-normal text-neutral-500">(Avg)</span>
                      </div>
                      <div className="text-neutral-400 text-[11px]">
                        Min: {item.minMs} ms &bull; Max: {item.maxMs} ms
                      </div>
                      <div className="text-neutral-500 text-[11px]">
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
              stroke="#18181b"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: "#ffffff", stroke: "#18181b" }}
              activeDot={{ r: 6, fill: "#18181b", stroke: "#ffffff", strokeWidth: 2 }}
              fillOpacity={1}
              fill="url(#responseTimeGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {formattedData.length === 1 && (
        <p className="text-[11px] text-neutral-400 text-center pt-2">
          1 data point recorded. Click <strong>"Run Check Now"</strong> above to record more pings immediately.
        </p>
      )}
    </div>
  );
}
