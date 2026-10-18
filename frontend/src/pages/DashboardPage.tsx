import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { StatusBadge } from "../components/ui/StatusBadge.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";
import { EmptyState } from "../components/ui/EmptyState.js";

export function DashboardPage() {
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Health Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time status overview and recent health checks</p>
        </div>
        <Link
          to="/monitors/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Monitors */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Monitors</span>
            <Server className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totals.monitors}</div>
          <div className="text-xs text-slate-400 mt-1">Total configured</div>
        </div>

        {/* Up */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Operational</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{totals.up}</div>
          <div className="text-xs text-slate-400 mt-1">Passing checks</div>
        </div>

        {/* Down */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Outages</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{totals.down}</div>
          <div className="text-xs text-slate-400 mt-1">Failing endpoints</div>
        </div>

        {/* Open Incidents */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Incidents</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{totals.openIncidents}</div>
          <div className="text-xs text-slate-400 mt-1">Active downtime</div>
        </div>

        {/* New Reports */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-xs font-semibold uppercase tracking-wider">New Reports</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600">{totals.newReports}</div>
          <div className="text-xs text-slate-400 mt-1">User problem reports</div>
        </div>
      </div>

      {/* 24-Hour Rolling Performance Summary */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-2 text-blue-200 text-xs uppercase font-semibold tracking-wider">
          <TrendingUp className="w-4 h-4" />
          Last 24 Hours Performance
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
          <div>
            <div className="text-3xl font-extrabold">{last24h.uptimePct}%</div>
            <div className="text-xs text-blue-200 mt-1">Overall System Uptime</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold">{last24h.avgResponseMs} ms</div>
            <div className="text-xs text-blue-200 mt-1">Average Response Latency</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold">{last24h.checks.toLocaleString()}</div>
            <div className="text-xs text-blue-200 mt-1">Total Health Checks Executed</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Monitors Overview & Recent Checks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Monitored Services (Down First) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Monitors Overview</h2>
            <Link to="/monitors" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all {totals.monitors} monitors <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {monitors.length === 0 ? (
            <EmptyState
              title="No monitors configured"
              description="Add your first website or API endpoint to start automated uptime checks."
              action={
                <Link
                  to="/monitors/new"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium"
                >
                  Create Monitor
                </Link>
              }
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {monitors.map((m) => (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/monitors/${m.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 truncate text-sm"
                        >
                          {m.name}
                        </Link>
                        {m.isSimulatedTarget && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded font-medium">
                            Simulated Target
                          </span>
                        )}
                        {m.recentReports15m > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                            {m.recentReports15m} reports in 15m
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{m.url}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>Check every {m.checkIntervalSeconds}s</span>
                        {m.lastResponseTimeMs !== null && (
                          <span>&bull; {m.lastResponseTimeMs}ms latency</span>
                        )}
                        {m.lastError && (
                          <span className="text-rose-600 font-medium">&bull; {m.lastError}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={m.status} size="sm" />
                      <button
                        onClick={() => handleRunCheck(m.id)}
                        disabled={runningChecks.has(m.id)}
                        title="Run check immediately"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded border border-slate-200 disabled:opacity-40 transition-colors"
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
            <h2 className="text-lg font-bold text-slate-900">Recent Checks</h2>
            <span className="text-xs text-slate-400">Live stream</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 divide-y divide-slate-100">
            {recentChecks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No recent checks recorded.</div>
            ) : (
              recentChecks.map((c) => (
                <div key={c.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="font-medium text-slate-800 truncate">{c.monitorName}</div>
                    <div className="text-slate-400 text-[11px]">
                      {new Date(c.checkedAt).toLocaleTimeString()} &bull; {c.trigger}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadge status={c.isSuccessful ? "up" : "down"} size="sm" />
                    <div className="text-[11px] text-slate-400 mt-0.5">
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
