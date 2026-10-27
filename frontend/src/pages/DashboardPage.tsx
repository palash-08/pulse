import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import { getDashboard } from "../api/dashboard.js";
import { runManualCheck } from "../api/monitors.js";
import { DashboardData } from "../api/types.js";
import { usePolling } from "../hooks/usePolling.js";
import { useTheme } from "../context/useTheme.js";
import { StatusBadge } from "../components/ui/StatusBadge.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";
import { EmptyState } from "../components/ui/EmptyState.js";
import { FlairButton } from "../components/ui/FlairButton.js";
import { Meteors } from "@/components/ui/meteors";

export function DashboardPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningChecks, setRunningChecks] = useState<Set<number>>(new Set());

  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await getDashboard();
      setData(res);
      setError(null);
    } catch (err: any) {
      if (!isBackground) {
        setError(err.message || "Failed to load dashboard data");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Poll every 15 seconds in the background
  usePolling(() => fetchData(true), 15000);

  const handleRunCheck = async (monitorId: number) => {
    try {
      setRunningChecks((prev) => new Set(prev).add(monitorId));
      await runManualCheck(monitorId);
      await fetchData(true);
    } catch (err: any) {
      alert(`Manual check failed: ${err.message}`);
    } finally {
      setRunningChecks((prev) => {
        const next = new Set(prev);
        next.delete(monitorId);
        return next;
      });
    }
  };

  if (loading) {
    return <Spinner size="lg" />;
  }

  if (error || !data) {
    return <ErrorState message={error || "Failed to load dashboard"} onRetry={() => fetchData()} />;
  }

  const { totals, last24h, recentChecks, monitors } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 dark:text-white tracking-tight transition-colors">
            System Health Dashboard
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time status overview and recent health checks
          </p>
        </div>
        <FlairButton
          as={Link}
          to="/monitors/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-neutral-900 dark:border-white text-xs font-medium shadow-xs transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </FlairButton>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Monitors */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Monitors</span>
            <Server className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-neutral-900 dark:text-white">{totals.monitors}</div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Total configured</div>
        </div>

        {/* Up */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Operational</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400">{totals.up}</div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Passing checks</div>
        </div>

        {/* Down */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Outages</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-rose-600 dark:text-rose-400">{totals.down}</div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Failing endpoints</div>
        </div>

        {/* Open Incidents */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Open Incidents</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-amber-600 dark:text-amber-400">{totals.openIncidents}</div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Active downtime</div>
        </div>

        {/* New Reports */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs col-span-2 lg:col-span-1 transition-colors">
          <div className="flex items-center justify-between text-neutral-700 dark:text-neutral-300">
            <span className="text-[11px] font-semibold uppercase tracking-wider">New Reports</span>
            <FileText className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-neutral-900 dark:text-white">{totals.newReports}</div>
          <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">User problem reports</div>
        </div>
      </div>

      {/* 24-Hour Rolling Performance Summary */}
      <div className="relative overflow-hidden bg-white dark:bg-neutral-900/90 rounded-3xl p-6 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
        <Meteors number={25} color={isDark ? "#ffffff" : "#71717a"} trailColor={isDark ? "#ffffff" : "#a1a1aa"} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-xs uppercase font-medium tracking-wider">
            <TrendingUp className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            Last 24 Hours Performance
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
            <div>
              <div className="text-3xl font-serif font-bold text-neutral-900 dark:text-white">{last24h.uptimePct}%</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Overall System Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-serif font-bold text-neutral-900 dark:text-white">{last24h.avgResponseMs} ms</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Average Response Latency</div>
            </div>
            <div>
              <div className="text-3xl font-serif font-bold text-neutral-900 dark:text-white">{last24h.checks.toLocaleString()}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Total Health Checks Executed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Monitors Overview & Recent Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Monitored Services (Down First) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-white">Monitors Overview</h2>
            <Link to="/monitors" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors">
              View all {totals.monitors} monitors <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {monitors.length === 0 ? (
            <EmptyState
              title="No monitors configured"
              description="Add your first website or API endpoint to start automated uptime checks."
              action={
                <FlairButton
                  as={Link}
                  to="/monitors/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-900 dark:border-white text-xs font-medium transition-all shadow-xs active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  Create Monitor
                </FlairButton>
              }
            />
          ) : (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden transition-colors">
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {monitors.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/monitors/${m.id}`)}
                    className="p-4 flex items-center justify-between hover:bg-neutral-50/75 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0 pr-4 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/monitors/${m.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-neutral-900 dark:text-neutral-100 text-sm hover:underline group-hover:text-black dark:group-hover:text-white truncate max-w-xs transition-colors"
                        >
                          {m.name}
                        </Link>
                        {m.isSimulatedTarget && (
                          <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2 py-0.5 rounded-full font-mono">
                            demo
                          </span>
                        )}
                        {m.recentReports15m > 0 && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                            {m.recentReports15m} reports in 15m
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-sm">{m.url}</div>
                      <div className="text-[11px] text-neutral-400 dark:text-neutral-500 flex items-center gap-2 flex-wrap">
                        <span className="whitespace-nowrap">Check every {m.checkIntervalSeconds}s</span>
                        {m.lastResponseTimeMs !== null && (
                          <span className="whitespace-nowrap">&bull; {m.lastResponseTimeMs}ms latency</span>
                        )}
                        {m.lastError && (
                          <span className="text-rose-600 dark:text-rose-400 font-medium truncate max-w-[220px]" title={m.lastError}>
                            &bull; {m.lastError}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2.5 flex-shrink-0"
                    >
                      <StatusBadge status={m.status} size="sm" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunCheck(m.id);
                        }}
                        disabled={runningChecks.has(m.id)}
                        title="Run check immediately"
                        className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 transition-colors"
                      >
                        <Play className={`w-3.5 h-3.5 ${runningChecks.has(m.id) ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Checks Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-white">Recent Checks</h2>
            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">Live stream</span>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-5 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden transition-colors">
            {recentChecks.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">No recent checks recorded.</div>
            ) : (
              recentChecks.map((c) => (
                <div key={c.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-medium text-neutral-800 dark:text-neutral-200 truncate" title={c.monitorName}>
                      {c.monitorName}
                    </div>
                    <div className="text-neutral-400 dark:text-neutral-500 text-[11px] whitespace-nowrap truncate">
                      {new Date(c.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })} &bull; {c.trigger}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 max-w-[55%]">
                    <StatusBadge status={c.isSuccessful ? "up" : "down"} size="sm" />
                    <div
                      className={`text-[11px] mt-0.5 font-mono truncate ${
                        c.isSuccessful ? "text-neutral-400 dark:text-neutral-500" : "text-rose-600 dark:text-rose-400 font-medium"
                      }`}
                      title={c.errorSummary || undefined}
                    >
                      {c.responseTimeMs !== null ? `${c.responseTimeMs} ms` : c.errorSummary || "Error"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
