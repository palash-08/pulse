import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Play, ExternalLink, Trash2, Edit3 } from "lucide-react";
import { listMonitors, runManualCheck, deleteMonitor } from "../api/monitors.js";
import { MonitorSummary } from "../api/types.js";
import { usePolling } from "../hooks/usePolling.js";
import { StatusBadge } from "../components/ui/StatusBadge.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";
import { EmptyState } from "../components/ui/EmptyState.js";
import { Pagination } from "../components/ui/Pagination.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";

export function MonitorsPage() {
  const [monitors, setMonitors] = useState<MonitorSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"up" | "down" | "unknown" | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningChecks, setRunningChecks] = useState<Set<number>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

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
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 tracking-tight">Monitors</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage and inspect all configured website and API monitors</p>
        </div>
        <Link
          to="/monitors/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-full text-xs font-medium hover:bg-black shadow-sm transition-all active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search monitors by name or URL..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-neutral-200 rounded-full placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(["all", "up", "down", "unknown"] as const).map((st) => {
            const isSelected = st === "all" ? statusFilter === undefined : statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => {
                  setPage(1);
                  setStatusFilter(st === "all" ? undefined : st);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
                  isSelected
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Spinner size="lg" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchMonitors()} />
      ) : monitors.length === 0 ? (
        <EmptyState
          title="No monitors match your criteria"
          description="Try adjusting your search query or filter settings, or add a new monitor."
          action={
            <Link
              to="/monitors/new"
              className="px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-medium hover:bg-black"
            >
              Add Monitor
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-xs">
              <thead className="bg-neutral-50/75 text-neutral-500 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left">Monitor</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Interval</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Last Check</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Response Time</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {monitors.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/monitors/${m.id}`}
                          className="font-medium text-neutral-900 hover:underline"
                        >
                          {m.name}
                        </Link>
                        {m.isSimulatedTarget && (
                          <span className="text-[10px] bg-neutral-100 text-neutral-600 border border-neutral-200 px-2 py-0.5 rounded-full font-mono">
                            Simulated
                          </span>
                        )}
                        {m.recentReports15m > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                            {m.recentReports15m} reports
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 truncate max-w-xs">{m.url}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={m.status} size="sm" />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-600 font-mono">
                      {m.checkIntervalSeconds}s
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-500 font-mono">
                      {m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleTimeString() : "Never"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs max-w-xs">
                      {m.lastResponseTimeMs !== null ? (
                        <span className="font-mono text-neutral-800">{m.lastResponseTimeMs} ms</span>
                      ) : m.lastError ? (
                        <span className="text-rose-600 truncate block max-w-[200px]" title={m.lastError}>{m.lastError}</span>
                      ) : (
                        <span className="text-neutral-400">&mdash;</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-1.5">
                      <button
                        onClick={() => handleRunCheck(m.id)}
                        disabled={runningChecks.has(m.id)}
                        title="Run check now"
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-full hover:bg-neutral-100 disabled:opacity-40"
                      >
                        <Play className={`w-3.5 h-3.5 ${runningChecks.has(m.id) ? "animate-spin" : ""}`} />
                      </button>
                      <Link
                        to={`/monitors/${m.id}`}
                        title="View details & charts"
                        className="inline-block p-1.5 text-neutral-500 hover:text-neutral-900 rounded-full hover:bg-neutral-100"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to={`/monitors/${m.id}/edit`}
                        title="Edit settings"
                        className="inline-block p-1.5 text-neutral-500 hover:text-neutral-900 rounded-full hover:bg-neutral-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setDeleteTargetId(m.id)}
                        title="Delete monitor"
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-full hover:bg-rose-50"
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
