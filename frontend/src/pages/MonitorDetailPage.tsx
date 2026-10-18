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
} from "lucide-react";
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
  const [range, setRange] = useState<"24h" | "7d" | "30d">("7d");
  const [summary, setSummary] = useState<UptimeSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);

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
      await loadData(true);
    } catch (err: any) {
      alert(`Manual check failed: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  const handleToggleReportLink = async () => {
    if (!monitor) return;
    try {
      if (monitor.reportsEnabled) {
        await disableReportLink(monitorId);
      } else {
        await enableReportLink(monitorId);
      }
      await loadData(true);
    } catch (err: any) {
      alert(`Failed to update report link: ${err.message}`);
    }
  };

  const handleCopyReportLink = () => {
    if (!monitor?.reportToken) return;
    const link = `${window.location.origin}/report/${monitor.reportToken}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDelete = async () => {
    try {
      await deleteMonitor(monitorId);
      navigate("/monitors");
    } catch (err: any) {
      alert(`Failed to delete monitor: ${err.message}`);
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Monitors
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCheck}
            disabled={checking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            <Play className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Run Check Now"}
          </button>
          <Link
            to={`/monitors/${monitorId}/edit`}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
            title="Delete monitor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monitor Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">{monitor.name}</h1>
              <StatusBadge status={monitor.status} size="md" />
              {monitor.isSimulatedTarget && (
                <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                  Simulated Target (localhost:4100)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                className="hover:underline hover:text-blue-600 flex items-center gap-1"
              >
                {monitor.url} <ExternalLink className="w-3 h-3" />
              </a>
              <span>&bull; Checked every {monitor.checkIntervalSeconds}s</span>
            </div>
          </div>

          {/* Problem Report Link Tool */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-w-md w-full text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                Public Problem Report Link
              </span>
              <button
                onClick={handleToggleReportLink}
                className="text-[11px] font-semibold text-blue-600 hover:underline"
              >
                {monitor.reportsEnabled ? "Disable" : "Enable"}
              </button>
            </div>

            {monitor.reportsEnabled && monitor.reportToken ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/report/${monitor.reportToken}`}
                  className="bg-white px-2 py-1 border border-slate-300 rounded text-[11px] text-slate-600 flex-1 select-all"
                />
                <button
                  onClick={handleCopyReportLink}
                  className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-[11px] font-medium flex items-center gap-1 text-slate-700"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? "Copied" : "Copy"}
                </button>
              </div>
            ) : (
              <p className="text-slate-400 text-[11px]">
                Generate a secure, unguessable link allowing external users to report problems.
              </p>
            )}
          </div>
        </div>

        {/* Active Open Incident Notice */}
        {openIncident && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 animate-bounce" />
              <div>
                <span className="font-bold">Active Downtime Incident #{openIncident.id}:</span>{" "}
                Started {new Date(openIncident.startedAt).toLocaleString()} ({openIncident.durationSeconds}s ago).
                {openIncident.firstError && (
                  <span className="block mt-0.5 text-rose-700 font-medium">
                    Trigger error: {openIncident.firstError} ({openIncident.failedChecks} failed checks)
                  </span>
                )}
              </div>
            </div>
            <span className="px-2 py-1 bg-rose-600 text-white font-bold rounded uppercase text-[10px] tracking-wider">
              Open
            </span>
          </div>
        )}
      </div>

      {/* Summary Stats & Range Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Uptime & Latency Metrics</h2>
          <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md transition-all ${
                  range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Uptime Ratio</div>
              <div
                className={`text-xl font-bold mt-1 ${
                  summary.uptimePct >= 99
                    ? "text-emerald-600"
                    : summary.uptimePct >= 95
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}
              >
                {summary.uptimePct}%
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Avg Response</div>
              <div className="text-xl font-bold mt-1 text-slate-900">{summary.avgResponseMs} ms</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Min Latency</div>
              <div className="text-xl font-bold mt-1 text-slate-700">{summary.minResponseMs} ms</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Max Latency</div>
              <div className="text-xl font-bold mt-1 text-slate-700">{summary.maxResponseMs} ms</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Total Checks</div>
              <div className="text-xl font-bold mt-1 text-slate-900">
                {summary.successfulChecks} / {summary.totalChecks}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs text-slate-500">Incidents</div>
              <div className="text-xl font-bold mt-1 text-slate-900">{summary.incidentCount}</div>
            </div>
          </div>
        )}
      </div>

      {/* Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">Response Latency Trend ({range.toUpperCase()})</h3>
          <p className="text-xs text-slate-400 mb-2">Average response time over interval buckets</p>
          <ResponseTimeChart data={chartData?.points || []} />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800">Uptime Stability ({range.toUpperCase()})</h3>
          <p className="text-xs text-slate-400 mb-2">Percentage uptime ratio by time bucket</p>
          <UptimeChart data={chartData?.points || []} />
        </div>
      </div>

      {/* Health Check History Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Health Check History</h2>
            <p className="text-xs text-slate-400">Detailed chronological log of all checks executed</p>
          </div>

          <div className="flex items-center gap-1.5">
            {(["all", "up", "down"] as const).map((res) => {
              const isSelected = res === "all" ? resultFilter === undefined : resultFilter === res;
              return (
                <button
                  key={res}
                  onClick={() => {
                    setHistoryPage(1);
                    setResultFilter(res === "all" ? undefined : res);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {res}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">Time</th>
                  <th scope="col" className="px-6 py-3 text-left">Result</th>
                  <th scope="col" className="px-6 py-3 text-left">HTTP Status</th>
                  <th scope="col" className="px-6 py-3 text-left">Response Time</th>
                  <th scope="col" className="px-6 py-3 text-left">Trigger</th>
                  <th scope="col" className="px-6 py-3 text-left">Error Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {historyItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No health checks recorded matching filter.
                    </td>
                  </tr>
                ) : (
                  historyItems.map((chk) => (
                    <tr key={chk.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                        {new Date(chk.checkedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <StatusBadge status={chk.isSuccessful ? "up" : "down"} size="sm" />
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap font-mono text-slate-700">
                        {chk.statusCode ?? "—"}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap font-medium text-slate-800">
                        {chk.responseTimeMs !== null ? `${chk.responseTimeMs} ms` : "—"}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap capitalize text-slate-500">
                        {chk.trigger}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-rose-600 font-mono">
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
        </div>
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
