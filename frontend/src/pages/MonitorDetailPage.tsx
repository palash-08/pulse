import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Bell,
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
  getMonitorSsl,
  checkMonitorSsl,
} from "../api/monitors.js";
import {
  MonitorSummary,
  Incident,
  UptimeSummary,
  ChartData,
  Check as CheckType,
  MonitorSslResponse,
} from "../api/types.js";
import { usePolling } from "../hooks/usePolling.js";
import { StatusBadge } from "../components/ui/StatusBadge.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";
import { Pagination } from "../components/ui/Pagination.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";
import { FlairButton } from "../components/ui/FlairButton.js";
import { Loader } from "@/components/ui/loader";
import { ResponseTimeChart } from "../components/charts/ResponseTimeChart.js";
import { UptimeChart } from "../components/charts/UptimeChart.js";
import { SslCertificateCard } from "../components/ssl/SslCertificateCard.js";
import { InteractiveAreaChart, ChartPoint, AreaChartData } from "../components/ui/interactive-area-chart.js";

export function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const monitorId = Number(id);
  const navigate = useNavigate();

  const [monitor, setMonitor] = useState<MonitorSummary | null>(null);
  const [openIncident, setOpenIncident] = useState<Incident | null>(null);
  const [range, setRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const [selectedTab, setSelectedTab] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const [summary, setSummary] = useState<UptimeSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [cachedSummaryByRange, setCachedSummaryByRange] = useState<Record<string, UptimeSummary>>({});
  const [cachedChartDataByRange, setCachedChartDataByRange] = useState<Record<string, ChartData>>({});
  const [cachedPointsByRange, setCachedPointsByRange] = useState<Record<string, ChartPoint[]>>({});
  const [rotatingToken, setRotatingToken] = useState(false);

  const toChartPoints = (points?: { bucketStart: string; avgMs: number }[]): ChartPoint[] => {
    if (!points || points.length === 0) return [];
    return points.map((p) => ({
      date: new Date(p.bucketStart).getTime(),
      value: Math.round(p.avgMs),
    }));
  };

  useEffect(() => {
    if (chartData?.points) {
      setCachedPointsByRange((prev) => ({
        ...prev,
        [range.toUpperCase()]: toChartPoints(chartData.points),
      }));
    }
  }, [chartData, range]);

  const areaChartData: AreaChartData = useMemo(() => {
    return {
      "1H": cachedPointsByRange["1H"] ?? [],
      "24H": cachedPointsByRange["24H"] ?? [],
      "7D": cachedPointsByRange["7D"] ?? [],
      "30D": cachedPointsByRange["30D"] ?? [],
    };
  }, [cachedPointsByRange]);

  // SSL State
  const [sslData, setSslData] = useState<MonitorSslResponse | null>(null);
  const [checkingSsl, setCheckingSsl] = useState(false);
  const [sslSuccessMessage, setSslSuccessMessage] = useState<string | null>(null);

  // History table
  const [historyItems, setHistoryItems] = useState<CheckType[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [resultFilter, setResultFilter] = useState<"up" | "down" | undefined>(undefined);

  // Granular loading states to prevent full-page unmounting
  const [initialLoading, setInitialLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sequential request trackers to avoid race conditions
  const rangeReqRef = useRef(0);
  const historyReqRef = useRef(0);

  const loadAll = async (isBackground = false) => {
    try {
      if (!isBackground) setInitialLoading(true);
      const [
        monitorRes,
        summaryRes,
        charts1h,
        charts24h,
        charts7d,
        charts30d,
        historyRes,
      ] = await Promise.all([
        getMonitor(monitorId),
        getMonitorSummary(monitorId, range),
        getMonitorResponseTimes(monitorId, "1h"),
        getMonitorResponseTimes(monitorId, "24h"),
        getMonitorResponseTimes(monitorId, "7d"),
        getMonitorResponseTimes(monitorId, "30d"),
        getMonitorHistory(monitorId, {
          result: resultFilter,
          page: historyPage,
          pageSize: 15,
        }),
      ]);

      setMonitor(monitorRes.monitor);
      setOpenIncident(monitorRes.openIncident);
      setSummary(summaryRes);

      const activeChartsRes =
        range === "1h" ? charts1h : range === "7d" ? charts7d : range === "30d" ? charts30d : charts24h;
      setChartData(activeChartsRes);
      setCachedSummaryByRange((prev) => ({ ...prev, [range]: summaryRes }));
      setCachedChartDataByRange({
        "1h": charts1h,
        "24h": charts24h,
        "7d": charts7d,
        "30d": charts30d,
      });
      setCachedPointsByRange({
        "1H": toChartPoints(charts1h.points),
        "24H": toChartPoints(charts24h.points),
        "7D": toChartPoints(charts7d.points),
        "30D": toChartPoints(charts30d.points),
      });
      setHistoryItems(historyRes.items);
      setHistoryTotal(historyRes.total);
      setError(null);

      // Fetch SSL info if monitor uses HTTPS
      if (monitorRes.monitor.url.toLowerCase().startsWith("https://")) {
        try {
          const sslRes = await getMonitorSsl(monitorId);
          setSslData(sslRes);
        } catch {
          // background SSL failure ignored
        }
      }
    } catch (err: any) {
      if (!isBackground) setError(err.message || "Failed to load monitor details");
    } finally {
      if (!isBackground) setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadAll(false);
  }, [monitorId]);

  usePolling(() => {
    // Poll silently in the background
    if (!metricsLoading && !historyLoading) {
      loadAll(true);
    }
  }, 15000);

  // Granular handler for 1h, 24h, 7d, 30d time ranges
  const handleRangeChange = async (newRange: "1h" | "24h" | "7d" | "30d") => {
    setSelectedTab(newRange);
    if (newRange === range && !metricsLoading) return;

    const reqId = ++rangeReqRef.current;

    // Fast path: if this range's chart data was already cached, switch immediately with zero lag
    if (cachedChartDataByRange[newRange]) {
      setRange(newRange);
      setChartData(cachedChartDataByRange[newRange]);
    }

    if (cachedSummaryByRange[newRange]) {
      setSummary(cachedSummaryByRange[newRange]);
    } else {
      setMetricsLoading(true);
    }

    // Revalidate in background to get latest points and summary
    try {
      const [summaryRes, chartsRes] = await Promise.all([
        getMonitorSummary(monitorId, newRange),
        getMonitorResponseTimes(monitorId, newRange),
      ]);
      if (reqId === rangeReqRef.current) {
        setCachedSummaryByRange((prev) => ({ ...prev, [newRange]: summaryRes }));
        setCachedChartDataByRange((prev) => ({ ...prev, [newRange]: chartsRes }));
        setCachedPointsByRange((prev) => ({
          ...prev,
          [newRange.toUpperCase()]: toChartPoints(chartsRes.points),
        }));
        setRange(newRange);
        setSummary(summaryRes);
        setChartData(chartsRes);
      }
    } catch (err: any) {
      console.error("Failed to load metrics for range", newRange, err);
    } finally {
      if (reqId === rangeReqRef.current) {
        setMetricsLoading(false);
      }
    }
  };

  // Granular handler for All / Successful / Failed history filter
  const fetchHistoryOnly = async (filter: "up" | "down" | undefined, pageNum: number) => {
    const reqId = ++historyReqRef.current;
    setHistoryLoading(true);

    try {
      const historyRes = await getMonitorHistory(monitorId, {
        result: filter,
        page: pageNum,
        pageSize: 15,
      });
      if (reqId === historyReqRef.current) {
        setHistoryItems(historyRes.items);
        setHistoryTotal(historyRes.total);
      }
    } catch (err: any) {
      console.error("Failed to load history items", err);
    } finally {
      if (reqId === historyReqRef.current) {
        setHistoryLoading(false);
      }
    }
  };

  const handleFilterChange = (newFilter: "up" | "down" | undefined) => {
    if (newFilter === resultFilter && !historyLoading) return;
    setResultFilter(newFilter);
    setHistoryPage(1);
    fetchHistoryOnly(newFilter, 1);
  };

  const handlePageChange = (newPage: number) => {
    setHistoryPage(newPage);
    fetchHistoryOnly(resultFilter, newPage);
  };

  const handleRunCheck = async () => {
    try {
      setChecking(true);
      await runManualCheck(monitorId);
      await loadAll(true);
    } catch (err: any) {
      alert(`Manual check failed: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  const handleRefreshSsl = async () => {
    try {
      setCheckingSsl(true);
      setSslSuccessMessage(null);
      const res = await checkMonitorSsl(monitorId);
      if (res.check) {
        setSslData((prev) => ({
          isHttps: true,
          latest: res.check,
          history: prev ? [res.check!, ...prev.history.slice(0, 19)] : [res.check!],
        }));
        setSslSuccessMessage("SSL certificate successfully inspected!");
        setTimeout(() => setSslSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert(`SSL check failed: ${err.message}`);
    } finally {
      setCheckingSsl(false);
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
      await loadAll(true);
    } catch (err: any) {
      alert(`Failed to update report link: ${err.message}`);
    }
  };

  const handleRotateReportLink = async () => {
    if (!monitor) return;
    try {
      setRotatingToken(true);
      await enableReportLink(monitorId);
      await loadAll(true);
    } catch (err: any) {
      alert(`Failed to rotate report link: ${err.message}`);
    } finally {
      setRotatingToken(false);
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

  if (initialLoading && !monitor) {
    return <Spinner size="lg" />;
  }

  if (error || !monitor) {
    return <ErrorState message={error || "Monitor not found"} onRetry={() => loadAll(false)} />;
  }

  return (
    <div className="space-y-8">
      {/* Back button & Action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/monitors"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Monitors
        </Link>

        <div className="flex items-center gap-2">
          <FlairButton
            onClick={handleRunCheck}
            disabled={checking}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-900 dark:border-white text-xs font-medium disabled:opacity-50 shadow-sm transition-all active:scale-[0.99]"
          >
            <Play className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Run Check Now"}
          </FlairButton>
          <Link
            to={`/monitors/${monitorId}/edit`}
            className="inline-flex items-center gap-1 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-medium rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete monitor"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monitor Header Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 sm:p-8 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-serif font-bold text-neutral-900 dark:text-white">{monitor.name}</h1>
              <StatusBadge status={monitor.status} size="md" />
              {monitor.recentReports15m > 0 && (
                <span className="text-xs bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  {monitor.recentReports15m} recent problem report{monitor.recentReports15m === 1 ? "" : "s"} (15m)
                </span>
              )}
              {monitor.isSimulatedTarget && (
                <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-2.5 py-0.5 rounded-full font-mono">
                  Simulated Target (localhost:4100)
                </span>
              )}
              <Link
                to="/account"
                className="text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 transition-colors"
              >
                <Bell className="w-3 h-3 text-indigo-600" /> Discord Alerts Active
              </Link>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
              <a
                href={monitor.url}
                target="_blank"
                rel="noreferrer"
                className="hover:underline hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"
              >
                {monitor.url} <ExternalLink className="w-3 h-3" />
              </a>
              <span>&bull; Checked every {monitor.checkIntervalSeconds}s</span>
            </div>
          </div>

          {/* Problem Report Link Tool */}
          <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl p-4 max-w-md w-full text-xs space-y-2.5 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-neutral-400" />
                Public Problem Report Link
              </span>
              <div className="flex items-center gap-2">
                {monitor.reportsEnabled && (
                  <button
                    onClick={handleRotateReportLink}
                    disabled={rotatingToken}
                    className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:underline flex items-center gap-1 disabled:opacity-50"
                    title="Generate a new public report token"
                  >
                    <RefreshCw className={`w-3 h-3 ${rotatingToken ? "animate-spin" : ""}`} />
                    Rotate
                  </button>
                )}
                <button
                  onClick={handleToggleReportLink}
                  className="text-[11px] font-semibold text-neutral-900 dark:text-white hover:underline"
                >
                  {monitor.reportsEnabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>

            {monitor.reportsEnabled ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/report/${monitor.reportToken}`}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full px-3 py-1.5 text-[11px] font-mono text-neutral-600 dark:text-neutral-300 flex-1 select-all outline-none"
                />
                <FlairButton
                  onClick={handleCopyReportLink}
                  className="px-3 py-1.5 rounded-full border border-neutral-900 dark:border-white text-[11px] font-medium shadow-xs transition-all active:scale-[0.99]"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? "Copied" : "Copy"}
                </FlairButton>
              </div>
            ) : (
              <p className="text-neutral-400 dark:text-neutral-500 text-[11px] leading-relaxed">
                Generate a secure, unguessable link allowing external users to report problems.
              </p>
            )}
          </div>
        </div>

        {/* Active Open Incident Notice */}
        {openIncident && (
          <div className="mt-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 animate-bounce" />
              <div>
                <span className="font-bold">Active Downtime Incident #{openIncident.id}:</span>{" "}
                Started {new Date(openIncident.startedAt).toLocaleString()} ({openIncident.durationSeconds}s ago).
                {openIncident.firstError && (
                  <span className="block mt-0.5 text-rose-700 dark:text-rose-400 font-medium">
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

      {/* SSL / TLS Certificate Tracker */}
      <SslCertificateCard
        isHttps={monitor.url.toLowerCase().startsWith("https://")}
        ssl={sslData?.latest || null}
        onRefreshSsl={handleRefreshSsl}
        refreshing={checkingSsl}
        successMessage={sslSuccessMessage}
      />

      {/* Summary Stats & Range Selector */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-serif font-bold text-neutral-900 dark:text-white">Uptime & Latency Metrics</h2>
              {metricsLoading && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-all">
                  <Loader variant="arc" size={12} className="text-neutral-600 dark:text-neutral-300" />
                  Updating...
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              Automated pings measure whether the service is accessible and its response time in milliseconds.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full text-xs font-medium self-start sm:self-auto transition-colors">
            {(["1h", "24h", "7d", "30d"] as const).map((r) => {
              const isSelected = selectedTab === r;
              return (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  className={`relative px-3.5 py-1 rounded-full text-xs font-medium transition-colors select-none ${
                    isSelected
                      ? "text-white dark:text-neutral-900"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  <span className="relative z-10">{r.toUpperCase()}</span>
                  {isSelected && (
                    <motion.div
                      layoutId="range-active-pill"
                      className="absolute inset-0 bg-neutral-900 dark:bg-white rounded-full shadow-xs"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Uptime Ratio</div>
              <div
                className={`text-2xl font-serif font-bold mt-1 ${
                  summary.uptimePct >= 99
                    ? "text-emerald-600 dark:text-emerald-400"
                    : summary.uptimePct >= 95
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {summary.uptimePct}%
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Avg Response</div>
              <div className="text-2xl font-serif font-bold mt-1 text-neutral-900 dark:text-white">{summary.avgResponseMs} ms</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Min Latency</div>
              <div className="text-2xl font-serif font-bold mt-1 text-neutral-800 dark:text-neutral-200">{summary.minResponseMs} ms</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Max Latency</div>
              <div className="text-2xl font-serif font-bold mt-1 text-neutral-800 dark:text-neutral-200">{summary.maxResponseMs} ms</div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Total Checks</div>
              <div className="text-2xl font-serif font-bold mt-1 text-neutral-900 dark:text-white">
                {summary.successfulChecks} / {summary.totalChecks}
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Incidents</div>
              <div className="text-2xl font-serif font-bold mt-1 text-neutral-900 dark:text-white">{summary.incidentCount}</div>
            </div>
          </div>
        )}
      </div>

      {summary && summary.totalChecks === 0 && (
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 text-xs text-neutral-600 dark:text-neutral-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
          <div>
            <span className="font-semibold text-neutral-900 dark:text-white">No health checks in the last {range}.</span>
            <p className="text-neutral-400 dark:text-neutral-500 text-[11px] mt-0.5">
              The service scheduler or manual checks will populate metrics over time.
            </p>
          </div>
          <button
            onClick={handleRunCheck}
            disabled={checking}
            className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full font-medium hover:bg-black dark:hover:bg-neutral-200 transition-colors flex-shrink-0"
          >
            Run Initial Check
          </button>
        </div>
      )}

      {/* Visual Charts: Interactive Area Chart + Uptime Bar Chart */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
          <InteractiveAreaChart
            title="Response Time (Latency)"
            unit="ms"
            data={areaChartData}
            selectedRange={selectedTab.toUpperCase()}
            onRangeChange={(r) => handleRangeChange(r.toLowerCase() as "1h" | "24h" | "7d" | "30d")}
            valueFormatter={(v) => `${Math.round(v).toLocaleString()} ms`}
            compactFormatter={(v) => `${Math.round(v)}ms`}
            height={260}
          />
        </div>

        {chartData && chartData.points.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xs transition-colors">
            <h3 className="font-serif font-bold text-lg text-neutral-900 dark:text-white mb-1">
              Uptime Availability
            </h3>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-4">
              Percentage of successful checks recorded per bucket over the selected timeframe.
            </p>
            <UptimeChart data={chartData.points} />
          </div>
        )}
      </div>

      {/* Health Checks History Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-serif font-bold text-lg text-neutral-900 dark:text-white">Check History</h3>
              {historyLoading && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-all">
                  <Loader variant="arc" size={12} className="text-neutral-600 dark:text-neutral-300" />
                  Updating...
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              Raw execution log recorded chronologically by the background checker.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full text-xs font-medium self-start sm:self-auto transition-colors">
            {[
              { id: undefined, label: "All" },
              { id: "up", label: "Successful" },
              { id: "down", label: "Failed" },
            ].map((f) => {
              const isSelected = resultFilter === f.id;
              return (
                <button
                  key={f.label}
                  onClick={() => handleFilterChange(f.id as "up" | "down" | undefined)}
                  disabled={historyLoading && isSelected}
                  className={`relative px-3.5 py-1 rounded-full text-xs font-medium transition-colors select-none ${
                    isSelected
                      ? f.id === "up" || f.id === "down"
                        ? "text-white"
                        : "text-white dark:text-neutral-900"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  <span className="relative z-10">{f.label}</span>
                  {isSelected && (
                    <motion.div
                      layoutId="history-filter-active-pill"
                      className={`absolute inset-0 rounded-full shadow-xs ${
                        f.id === "up"
                          ? "bg-emerald-600 text-white"
                          : f.id === "down"
                          ? "bg-rose-600 text-white"
                          : "bg-neutral-900 dark:bg-white"
                      }`}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
            <thead className="bg-neutral-50/75 dark:bg-neutral-800/60 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left">Time</th>
                <th scope="col" className="px-6 py-3.5 text-left">Result</th>
                <th scope="col" className="px-6 py-3.5 text-left">HTTP Status</th>
                <th scope="col" className="px-6 py-3.5 text-left">Response Time</th>
                <th scope="col" className="px-6 py-3.5 text-left">Trigger</th>
                <th scope="col" className="px-6 py-3.5 text-left">Error Summary</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900 transition-opacity duration-200 ${historyLoading ? "opacity-40" : "opacity-100"}`}>
              {historyItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-400 dark:text-neutral-500">
                    No health checks recorded matching filter.
                  </td>
                </tr>
              ) : (
                historyItems.map((chk) => (
                  <tr key={chk.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap text-neutral-600 dark:text-neutral-400 font-mono">
                      {new Date(chk.checkedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <StatusBadge status={chk.isSuccessful ? "up" : "down"} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono text-neutral-700 dark:text-neutral-300">
                      {chk.statusCode ?? "—"}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono text-neutral-800 dark:text-neutral-200">
                      {chk.responseTimeMs !== null ? `${chk.responseTimeMs} ms` : "—"}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap capitalize text-neutral-500 dark:text-neutral-400">
                      {chk.trigger}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-rose-600 dark:text-rose-400 font-mono max-w-sm">
                      <span className="truncate block max-w-xs sm:max-w-md" title={chk.errorSummary || undefined}>{chk.errorSummary || "—"}</span>
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
          onPageChange={handlePageChange}
        />
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
