import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { GlassButton, toast } from "glaceui";
import { GlassCard } from "../components/ui/GlassCard.js";
import {
  getMonitor,
  runManualCheck,
  getMonitorSummary,
  getMonitorResponseTimes,
  getMonitorHistory,
  enableReportLink,
  disableReportLink,
  deleteMonitor,
} from "../api/monitors.js";
import {
  MonitorSummary,
  Incident,
  UptimeSummary,
  ChartData,
  Check as CheckType,
} from "../api/types.js";
import { usePolling } from "../hooks/usePolling.js";
import { StatusBadge } from "../components/ui/StatusBadge.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";
import { Pagination } from "../components/ui/Pagination.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";
import { ResponseTimeChart } from "../components/charts/ResponseTimeChart.js";
import { UptimeChart } from "../components/charts/UptimeChart.js";

export function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const monitorId = Number(id);
  const navigate = useNavigate();

  const [monitor, setMonitor] = useState<MonitorSummary | null>(null);
  const [openIncident, setOpenIncident] = useState<Incident | null>(null);
  const [range, setRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const [summary, setSummary] = useState<UptimeSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [rotatingToken, setRotatingToken] = useState(false);

  // History table
  const [historyItems, setHistoryItems] = useState<CheckType[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [resultFilter, setResultFilter] = useState<"up" | "down" | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [monitorRes, summaryRes, chartsRes, historyRes] = await Promise.all([
        getMonitor(monitorId),
        getMonitorSummary(monitorId, range),
        getMonitorResponseTimes(monitorId, range),
        getMonitorHistory(monitorId, {
          result: resultFilter,
          page: historyPage,
          pageSize: 15,
        }),
      ]);

      setMonitor(monitorRes.monitor);
      setOpenIncident(monitorRes.openIncident);
      setSummary(summaryRes);
      setChartData(chartsRes);
      setHistoryItems(historyRes.items);
      setHistoryTotal(historyRes.total);
      setError(null);
    } catch (err: any) {
      if (!isBackground) setError(err.message || "Failed to load monitor details");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monitorId, range, historyPage, resultFilter]);

  usePolling(() => loadData(true), 15000);

  const handleRunCheck = async () => {
    try {
      setChecking(true);
      await runManualCheck(monitorId);
      toast.success("Health check executed successfully");
      await loadData(true);
    } catch (err: any) {
      toast.error(`Manual check failed: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  const handleToggleReportLink = async () => {
    if (!monitor) return;
    try {
      if (monitor.reportsEnabled) {
        await disableReportLink(monitorId);
        toast.success("Public report link disabled");
      } else {
        await enableReportLink(monitorId);
        toast.success("Public report link enabled");
      }
      await loadData(true);
    } catch (err: any) {
      toast.error(`Failed to update report link: ${err.message}`);
    }
  };

  const handleRotateReportLink = async () => {
    if (!monitor) return;
    try {
      setRotatingToken(true);
      await enableReportLink(monitorId);
      toast.success("Report link token regenerated");
      await loadData(true);
    } catch (err: any) {
      toast.error(`Failed to rotate report link: ${err.message}`);
    } finally {
      setRotatingToken(false);
    }
  };

  const handleCopyReportLink = () => {
    if (!monitor?.reportToken) return;
    const link = `${window.location.origin}/report/${monitor.reportToken}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDelete = async () => {
    try {
      await deleteMonitor(monitorId);
      toast.success("Monitor deleted successfully");
      navigate("/monitors");
    } catch (err: any) {
      toast.error(`Failed to delete monitor: ${err.message}`);
    }
  };

  if (loading) {
    return <Spinner size="lg" />;
  }

  if (error || !monitor) {
    return <ErrorState message={error || "Monitor not found"} onRetry={() => loadData()} />;
  }

  return (
    <div className="space-y-8">
      {/* Back button & Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/monitors"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Monitors
        </Link>

        <div className="flex items-center gap-2">
          <GlassButton
            tone="dark"
            size="sm"
            onClick={handleRunCheck}
            disabled={checking}
            className="gap-1.5"
          >
            <Play className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Run Check Now"}
          </GlassButton>
          <Link to={`/monitors/${monitorId}/edit`}>
            <GlassButton tone="dark" size="sm" className="gap-1">
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </GlassButton>
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-zinc-500 hover:text-rose-400 rounded-full hover:bg-rose-500/10 transition-colors"
            title="Delete monitor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monitor Header Card */}
      <GlassCard tone="dark" className="p-6 sm:p-8 border border-white/10 rounded-3xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-serif font-bold text-white tracking-tight">{monitor.name}</h1>
              <StatusBadge status={monitor.status} size="md" />
              {monitor.recentReports15m > 0 && (
                <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  {monitor.recentReports15m} recent problem report{monitor.recentReports15m === 1 ? "" : "s"} (15m)
                </span>
              )}
              {monitor.isSimulatedTarget && (
                <span className="text-xs bg-white/5 text-zinc-300 border border-white/10 px-2.5 py-0.5 rounded-full font-mono">
                  Simulated Target (localhost:4100)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                className="hover:underline hover:text-zinc-200 flex items-center gap-1"
              >
                {monitor.url} <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
              <span className="text-zinc-600">&bull;</span>
              <span>Checked every {monitor.checkIntervalSeconds}s</span>
            </div>
          </div>

          {/* Problem Report Link Tool */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 max-w-md w-full text-xs space-y-2.5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                Public Problem Report Link
              </span>
              <div className="flex items-center gap-2">
                {monitor.reportsEnabled && (
                  <button
                    onClick={handleRotateReportLink}
                    disabled={rotatingToken}
                    className="text-[11px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1 disabled:opacity-50 transition-colors"
                    title="Generate a new public report token"
                  >
                    <RefreshCw className={`w-3 h-3 ${rotatingToken ? "animate-spin" : ""}`} />
                    Rotate
                  </button>
                )}
                <button
                  onClick={handleToggleReportLink}
                  className="text-[11px] font-semibold text-zinc-300 hover:text-white hover:underline transition-colors"
                >
                  {monitor.reportsEnabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>

            {monitor.reportsEnabled && monitor.reportToken ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/report/${monitor.reportToken}`}
                  className="bg-zinc-900/80 px-3 py-1.5 border border-white/10 rounded-full text-[11px] text-zinc-300 flex-1 select-all focus:outline-none"
                />
                <GlassButton
                  tone="dark"
                  size="sm"
                  onClick={handleCopyReportLink}
                  className="gap-1 shrink-0"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? "Copied" : "Copy"}
                </GlassButton>
              </div>
            ) : (
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                Generate a secure, unguessable link allowing external users to report problems.
              </p>
            )}
          </div>
        </div>

        {/* Active Open Incident Notice */}
        {openIncident && (
          <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 animate-pulse" />
              <div>
                <span className="font-bold text-rose-200">Active Downtime Incident #{openIncident.id}:</span>{" "}
                Started {new Date(openIncident.startedAt).toLocaleString()} ({openIncident.durationSeconds}s ago).
                {openIncident.firstError && (
                  <span className="block mt-0.5 text-rose-300 font-medium">
                    Trigger error: {openIncident.firstError} ({openIncident.failedChecks} failed checks)
                  </span>
                )}
              </div>
            </div>
            <span className="px-2.5 py-1 bg-rose-500/30 text-rose-200 border border-rose-500/40 font-bold rounded-full uppercase text-[10px] tracking-wider">
              Open Outage
            </span>
          </div>
        )}
      </GlassCard>

      {/* Summary Stats & Range Selector */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-bold text-white">Uptime & Latency Metrics</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Automated pings measure whether the service is accessible and its response time in milliseconds.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-full text-xs font-medium self-start sm:self-auto backdrop-blur-md">
            {(["1h", "24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3.5 py-1 rounded-full transition-all ${
                  range === r
                    ? "bg-white/15 text-white shadow-sm border border-white/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <GlassCard tone="dark" interactive className="p-4 border border-white/10 rounded-2xl">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Uptime Ratio</div>
              <div
                className={`text-2xl font-serif font-bold mt-1 ${
                  summary.uptimePct >= 99
                    ? "text-emerald-400"
                    : summary.uptimePct >= 95
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {summary.uptimePct}%
              </div>
            </GlassCard>

            <GlassCard tone="dark" interactive className="p-4 border border-white/10 rounded-2xl">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Avg Response</div>
              <div className="text-2xl font-serif font-bold mt-1 text-white">{summary.avgResponseMs} ms</div>
            </GlassCard>

            <GlassCard tone="dark" interactive className="p-4 border border-white/10 rounded-2xl">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Min Latency</div>
              <div className="text-2xl font-serif font-bold mt-1 text-zinc-200">{summary.minResponseMs} ms</div>
            </GlassCard>

            <GlassCard tone="dark" interactive className="p-4 border border-white/10 rounded-2xl">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Max Latency</div>
              <div className="text-2xl font-serif font-bold mt-1 text-zinc-200">{summary.maxResponseMs} ms</div>
            </GlassCard>

            <GlassCard tone="dark" interactive className="p-4 border border-white/10 rounded-2xl">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Total Checks</div>
              <div className="text-2xl font-serif font-bold mt-1 text-white">
                {summary.successfulChecks} / {summary.totalChecks}
              </div>
            </GlassCard>

            <GlassCard tone="dark" interactive className="p-4 border border-white/10 rounded-2xl">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Incidents</div>
              <div className="text-2xl font-serif font-bold mt-1 text-white">{summary.incidentCount}</div>
            </GlassCard>
          </div>
        )}
      </div>

      {summary && summary.totalChecks === 0 && (
        <GlassCard tone="dark" className="border border-white/10 rounded-3xl p-5 text-xs text-zinc-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="font-semibold text-white block">
              Newly added monitor: No checks recorded yet
            </span>
            <p className="text-zinc-400 leading-relaxed max-w-xl">
              Pulse pings this URL automatically every {monitor?.checkIntervalSeconds}s. Click <strong>"Test Ping Now"</strong> to send an immediate ping and generate response time curves on the graphs below.
            </p>
          </div>
          <GlassButton
            tone="dark"
            size="sm"
            onClick={handleRunCheck}
            disabled={checking}
            className="shrink-0"
          >
            {checking ? "Pinging..." : "Test Ping Now"}
          </GlassButton>
        </GlassCard>
      )}

      {/* Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard tone="dark" className="p-6 rounded-3xl border border-white/10">
          <h3 className="text-sm font-semibold text-zinc-100">Response Latency Trend ({range.toUpperCase()})</h3>
          <p className="text-xs text-zinc-400 mb-2">Average response time over interval buckets</p>
          <ResponseTimeChart data={chartData?.points || []} />
        </GlassCard>

        <GlassCard tone="dark" className="p-6 rounded-3xl border border-white/10">
          <h3 className="text-sm font-semibold text-zinc-100">Uptime Stability ({range.toUpperCase()})</h3>
          <p className="text-xs text-zinc-400 mb-2">Percentage uptime ratio by time bucket</p>
          <UptimeChart data={chartData?.points || []} />
        </GlassCard>
      </div>

      {/* Health Check History Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-bold text-white">Health Check History</h2>
            <p className="text-xs text-zinc-400">Detailed chronological log of all checks executed</p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
            {(["all", "up", "down"] as const).map((res) => {
              const isSelected = res === "all" ? resultFilter === undefined : resultFilter === res;
              return (
                <button
                  key={res}
                  onClick={() => {
                    setHistoryPage(1);
                    setResultFilter(res === "all" ? undefined : res);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-full capitalize transition-all ${
                    isSelected
                      ? "bg-white/15 text-white shadow-sm border border-white/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {res}
                </button>
              );
            })}
          </div>
        </div>

        <GlassCard tone="dark" className="overflow-hidden p-0 border border-white/10 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06] text-xs">
              <thead className="bg-white/[0.02] text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left">Time</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Result</th>
                  <th scope="col" className="px-6 py-3.5 text-left">HTTP Status</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Response Time</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Trigger</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Error Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                      No health checks recorded matching filter.
                    </td>
                  </tr>
                ) : (
                  historyItems.map((chk) => (
                    <tr key={chk.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap text-zinc-400 font-mono">
                        {new Date(chk.checkedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <StatusBadge status={chk.isSuccessful ? "up" : "down"} size="sm" />
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono text-zinc-300">
                        {chk.statusCode ?? "—"}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono text-zinc-200">
                        {chk.responseTimeMs !== null ? `${chk.responseTimeMs} ms` : "—"}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap capitalize text-zinc-400">
                        {chk.trigger}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-rose-400 font-mono">
                        {chk.errorSummary || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={historyPage}
            pageSize={15}
            total={historyTotal}
            onPageChange={(p) => setHistoryPage(p)}
          />
        </GlassCard>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Monitor"
        message={`Are you sure you want to delete '${monitor.name}'? All history will be deleted.`}
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
