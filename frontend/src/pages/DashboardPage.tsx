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
import { GlassCard, GlassButton, toast } from "glaceui";
import { getDashboard } from "../api/dashboard.js";
import { runManualCheck } from "../api/monitors.js";
import { DashboardData } from "../api/types.js";
import { usePolling } from "../hooks/usePolling.js";
import { StatusBadge } from "../components/ui/StatusBadge.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";
import { EmptyState } from "../components/ui/EmptyState.js";

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningChecks, setRunningChecks] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

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
      await toast.promise(runManualCheck(monitorId), {
        loading: "Running health check...",
        success: (res: any) => `Check complete: ${res.check.isSuccessful ? "HTTP " + res.check.statusCode : res.check.errorSummary || "Failed"}`,
        error: (err: any) => `Manual check failed: ${err.message}`,
      });
      await fetchData(true);
    } catch {
      // toast.promise handles the notification
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
          <h1 className="text-3xl font-serif font-bold text-zinc-100 tracking-tight">System Health Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">Real-time status overview and automated probe history</p>
        </div>
        <GlassButton
          tone="dark"
          size="md"
          onClick={() => navigate("/monitors/new")}
          className="!font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </GlassButton>
      </div>

      {/* Metrics Row (Glacé Refracting Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Monitors */}
        <GlassCard tone="dark" interactive sheen radius={24} className="!p-5">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Monitors</span>
            <Server className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-zinc-100">{totals.monitors}</div>
          <div className="text-xs text-zinc-500 mt-1">Total configured</div>
        </GlassCard>

        {/* Up */}
        <GlassCard tone="dark" interactive sheen radius={24} className="!p-5">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Operational</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-emerald-400">{totals.up}</div>
          <div className="text-xs text-zinc-500 mt-1">Passing checks</div>
        </GlassCard>

        {/* Down */}
        <GlassCard tone="dark" interactive sheen radius={24} className="!p-5">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Outages</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-rose-400">{totals.down}</div>
          <div className="text-xs text-zinc-500 mt-1">Failing endpoints</div>
        </GlassCard>

        {/* Open Incidents */}
        <GlassCard tone="dark" interactive sheen radius={24} className="!p-5">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Open Incidents</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-amber-400">{totals.openIncidents}</div>
          <div className="text-xs text-zinc-500 mt-1">Active downtime</div>
        </GlassCard>

        {/* New Reports */}
        <GlassCard tone="dark" interactive sheen radius={24} className="!p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-[11px] font-semibold uppercase tracking-wider">New Reports</span>
            <FileText className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-zinc-100">{totals.newReports}</div>
          <div className="text-xs text-zinc-500 mt-1">Problem reports</div>
        </GlassCard>
      </div>

      {/* 24-Hour Rolling Performance Summary */}
      <GlassCard tone="dark" radius={24} className="!p-6 text-zinc-100">
        <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase font-medium tracking-wider">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Last 24 Hours Performance
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
          <div>
            <div className="text-3xl font-serif font-bold text-zinc-100">{last24h.uptimePct}%</div>
            <div className="text-xs text-zinc-400 mt-1">Overall System Uptime</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-zinc-100">{last24h.avgResponseMs} ms</div>
            <div className="text-xs text-zinc-400 mt-1">Average Response Latency</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-zinc-100">{last24h.checks.toLocaleString()}</div>
            <div className="text-xs text-zinc-400 mt-1">Total Health Checks Executed</div>
          </div>
        </div>
      </GlassCard>

      {/* Main Grid: Monitors Overview & Recent Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Monitored Services */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-zinc-100">Monitors Overview</h2>
            <Link to="/monitors" className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
              View all {totals.monitors} monitors <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {monitors.length === 0 ? (
            <EmptyState
              title="No monitors configured"
              description="Add your first website or API endpoint to start automated uptime checks."
              action={
                <GlassButton size="sm" tone="dark" onClick={() => navigate("/monitors/new")}>
                  Create Monitor
                </GlassButton>
              }
            />
          ) : (
            <GlassCard tone="dark" radius={24} className="!p-0 overflow-hidden">
              <div className="divide-y divide-white/[0.05]">
                {monitors.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/monitors/${m.id}`}
                          className="font-medium text-zinc-200 hover:text-white hover:underline truncate text-sm"
                        >
                          {m.name}
                        </Link>
                        {m.isSimulatedTarget && (
                          <span className="text-[10px] bg-white/[0.05] text-zinc-400 border border-white/[0.08] px-2 py-0.5 rounded-full font-mono">
                            Simulated Target
                          </span>
                        )}
                        {m.recentReports15m > 0 && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/25 px-2 py-0.5 rounded-full font-medium">
                            {m.recentReports15m} reports in 15m
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">{m.url}</div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                        <span>Check every {m.checkIntervalSeconds}s</span>
                        {m.lastResponseTimeMs !== null && (
                          <span>&bull; {m.lastResponseTimeMs}ms latency</span>
                        )}
                        {m.lastError && (
                          <span className="text-rose-400 font-medium">&bull; {m.lastError}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <StatusBadge status={m.status} size="sm" />
                      <button
                        onClick={() => handleRunCheck(m.id)}
                        disabled={runningChecks.has(m.id)}
                        title="Run check immediately"
                        className="p-2 text-zinc-400 hover:text-white glace-pill rounded-full disabled:opacity-40 transition-colors"
                      >
                        <Play className={`w-3.5 h-3.5 ${runningChecks.has(m.id) ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right Column: Recent Checks Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-zinc-100">Recent Checks</h2>
            <span className="text-xs text-zinc-500 font-mono">Live stream</span>
          </div>

          <GlassCard tone="dark" radius={24} className="!p-5 divide-y divide-white/[0.05]">
            {recentChecks.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">No recent checks recorded.</div>
            ) : (
              recentChecks.map((c) => (
                <div key={c.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2 truncate">
                      <Link to={`/monitors/${c.monitorId}`} className="font-medium text-zinc-200 hover:underline truncate">
                        {c.monitorName}
                      </Link>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(c.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {c.statusCode ? `HTTP ${c.statusCode}` : "No response"} &bull; {c.responseTimeMs ?? 0}ms
                      {c.errorSummary && <span className="text-rose-400"> &bull; {c.errorSummary}</span>}
                    </div>
                  </div>
                  <StatusBadge status={c.isSuccessful ? "up" : "down"} size="sm" />
                </div>
              ))
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
