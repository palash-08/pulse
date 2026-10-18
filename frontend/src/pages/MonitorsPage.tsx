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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monitors</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and inspect all configured website and API monitors</p>
        </div>
        <Link
          to="/monitors/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search monitors by name or URL..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
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
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium"
            >
              Add Monitor
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">Monitor</th>
                  <th scope="col" className="px-6 py-3 text-left">Status</th>
                  <th scope="col" className="px-6 py-3 text-left">Interval</th>
                  <th scope="col" className="px-6 py-3 text-left">Last Check</th>
                  <th scope="col" className="px-6 py-3 text-left">Response Time</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {monitors.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/monitors/${m.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {m.name}
                        </Link>
                        {m.isSimulatedTarget && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded font-medium">
                            Simulated
                          </span>
                        )}
                        {m.recentReports15m > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                            {m.recentReports15m} reports
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{m.url}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={m.status} size="sm" />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      {m.checkIntervalSeconds}s
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleTimeString() : "Never"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {m.lastResponseTimeMs !== null ? (
                        <span className="font-medium text-slate-700">{m.lastResponseTimeMs} ms</span>
                      ) : m.lastError ? (
                        <span className="text-rose-600">{m.lastError}</span>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                      <button
                        onClick={() => handleRunCheck(m.id)}
                        disabled={runningChecks.has(m.id)}
                        title="Run check now"
                        className="p-1 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100 disabled:opacity-40"
                      >
                        <Play className={`w-4 h-4 ${runningChecks.has(m.id) ? "animate-spin" : ""}`} />
                      </button>
                      <Link
                        to={`/monitors/${m.id}`}
                        title="View details & charts"
                        className="inline-block p-1 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/monitors/${m.id}/edit`}
                        title="Edit settings"
                        className="inline-block p-1 text-slate-600 hover:text-blue-600 rounded hover:bg-slate-100"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteTargetId(m.id)}
                        title="Delete monitor"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
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
