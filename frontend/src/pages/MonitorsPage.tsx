import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Play, ExternalLink, Trash2, Edit3, X } from "lucide-react";
import { listMonitors, runManualCheck, deleteMonitor } from "../api/monitors.js";
import { MonitorSummary } from "../api/types.js";
import { usePolling } from "../hooks/usePolling.js";
import { StatusBadge } from "../components/ui/StatusBadge.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";
import { EmptyState } from "../components/ui/EmptyState.js";
import { Pagination } from "../components/ui/Pagination.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";
import { FlairButton } from "../components/ui/FlairButton.js";
import { LockInput } from "@/components/ui/lock-input";
import { Loader } from "@/components/ui/loader";
import JellyRadio from "./JellyRadio";

export function MonitorsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [monitors, setMonitors] = useState<MonitorSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"up" | "down" | "unknown" | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningChecks, setRunningChecks] = useState<Set<number>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [highlightedMonitorId, setHighlightedMonitorId] = useState<number | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");

  useEffect(() => {
    const createdId = (location.state as any)?.createdMonitorId;
    if (createdId) {
      setHighlightedMonitorId(Number(createdId));
      setLiveAnnouncement("Monitor created");
      const timer = setTimeout(() => {
        setHighlightedMonitorId(null);
        navigate(".", { replace: true, state: null });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate]);

  const fetchMonitors = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await listMonitors({
        search,
        status: statusFilter,
        page,
        pageSize: 20,
      });
      setMonitors(res.items);
      setTotal(res.total);
      setError(null);
    } catch (err: any) {
      if (!isBackground) setError(err.message || "Failed to load monitors");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, [page, statusFilter]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchMonitors();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  usePolling(() => fetchMonitors(true), 15000);

  const handleRunCheck = async (id: number) => {
    try {
      setRunningChecks((prev) => new Set(prev).add(id));
      await runManualCheck(id);
      await fetchMonitors(true);
    } catch (err: any) {
      alert(`Manual check failed: ${err.message}`);
    } finally {
      setRunningChecks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMonitor(deleteTargetId);
      setDeleteTargetId(null);
      await fetchMonitors();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 dark:text-white tracking-tight transition-colors">
            Monitors
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage and inspect all configured website and API monitors
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

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="flex-1 w-full">
          <LockInput
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search monitors by name or URL..."
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={
              search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
            className="h-10 text-xs rounded-full bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          />
        </div>

        {/* Status Filters */}
        <div className="relative self-start sm:self-auto">
          <JellyRadio
            items={[
              { value: "all", label: "All" },
              { value: "up", label: "Up" },
              { value: "down", label: "Down" },
              { value: "unknown", label: "Unknown" }
            ]}
            value={statusFilter ?? "all"}
            onChange={(val) => {
              setPage(1);
              setStatusFilter(val === "all" ? undefined : (val as "up" | "down" | "unknown"));
            }}
            size="sm"
            ariaLabel="Monitor status filter"
          />
          <AnimatePresence>
            {loading && monitors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 pt-1.5 pointer-events-none z-10"
              >
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100/90 dark:bg-neutral-800/90 backdrop-blur-xs text-neutral-600 dark:text-neutral-300 shadow-xs border border-neutral-200/60 dark:border-neutral-700/60 whitespace-nowrap">
                  <Loader variant="arc" size={12} className="text-neutral-600 dark:text-neutral-300" />
                  Updating...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      {loading && monitors.length === 0 ? (
        <Spinner size="lg" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchMonitors()} />
      ) : monitors.length === 0 ? (
        <EmptyState
          title="No monitors match your criteria"
          description="Try adjusting your search query or filter settings, or add a new monitor."
          action={
            <FlairButton
              as={Link}
              to="/monitors/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-neutral-900 dark:border-white text-xs font-medium transition-all shadow-xs active:scale-[0.99]"
            >
              <Plus className="w-4 h-4" />
              Add Monitor
            </FlairButton>
          }
        />
      ) : (
        <div className={`bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden transition-all duration-200 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
              <thead className="bg-neutral-50/75 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left">Monitor</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Interval</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Last Check</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Response Time</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                {monitors.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => navigate(`/monitors/${m.id}`)}
                    className="hover:bg-neutral-50/75 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/monitors/${m.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-neutral-900 dark:text-white group-hover:underline transition-colors"
                        >
                          {m.name}
                        </Link>
                        {m.isSimulatedTarget && (
                          <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded-full font-mono">
                            Simulated
                          </span>
                        )}
                        {m.recentReports15m > 0 && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                            {m.recentReports15m} reports
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-xs">{m.url}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={m.status} size="sm" />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-600 dark:text-neutral-300 font-mono">
                      {m.checkIntervalSeconds}s
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                      {m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleTimeString() : "Never"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs max-w-xs">
                      {m.lastResponseTimeMs !== null ? (
                        <span className="font-mono text-neutral-800 dark:text-neutral-200">{m.lastResponseTimeMs} ms</span>
                      ) : m.lastError ? (
                        <span className="text-rose-600 dark:text-rose-400 truncate block max-w-[200px]" title={m.lastError}>{m.lastError}</span>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-500">&mdash;</span>
                      )}
                    </td>

                    <td
                      onClick={(e) => e.stopPropagation()}
                      className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-1.5"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunCheck(m.id);
                        }}
                        disabled={runningChecks.has(m.id)}
                        title="Run check now"
                        className="p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                      >
                        <Play className={`w-3.5 h-3.5 ${runningChecks.has(m.id) ? "animate-spin" : ""}`} />
                      </button>
                      <Link
                        to={`/monitors/${m.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="View details & charts"
                        className="inline-block p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to={`/monitors/${m.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                        title="Edit settings"
                        className="inline-block p-1.5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(m.id);
                        }}
                        title="Delete monitor"
                        className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageSize={20}
            total={total}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      )}

      {/* Screen reader live announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Delete Monitor"
        message="Are you sure you want to delete this monitor? All historical health checks and problem reports will be permanently deleted."
        confirmLabel="Delete Monitor"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
