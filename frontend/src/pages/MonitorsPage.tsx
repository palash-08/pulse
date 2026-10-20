import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Play, ExternalLink, Trash2, Edit3 } from "lucide-react";
import { GlassButton, toast } from "glaceui";
import { GlassCard } from "../components/ui/GlassCard.js";
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
      toast.success("Health check executed successfully");
      await fetchMonitors(true);
    } catch (err: any) {
      toast.error(`Manual check failed: ${err.message}`);
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
      toast.success("Monitor deleted");
      setDeleteTargetId(null);
      await fetchMonitors();
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">Monitors</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage and inspect all configured website and API monitors</p>
        </div>
        <Link to="/monitors/new">
          <GlassButton tone="dark" size="md" className="gap-2 font-medium">
            <Plus className="w-4 h-4 text-zinc-300" />
            <span>Add Monitor</span>
          </GlassButton>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search monitors by name or URL..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-900/60 border border-white/10 rounded-full text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/30 backdrop-blur-md transition-all shadow-inner"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto p-1 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
          {(["all", "up", "down", "unknown"] as const).map((st) => {
            const isSelected = st === "all" ? statusFilter === undefined : statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => {
                  setPage(1);
                  setStatusFilter(st === "all" ? undefined : st);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full capitalize transition-all ${
                  isSelected
                    ? "bg-white/15 text-white shadow-sm border border-white/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
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
            <Link to="/monitors/new">
              <GlassButton tone="dark" size="sm">
                Add Monitor
              </GlassButton>
            </Link>
          }
        />
      ) : (
        <GlassCard tone="dark" className="overflow-hidden p-0 border border-white/10 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06] text-xs">
              <thead className="bg-white/[0.02] text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left">Monitor</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Interval</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Last Check</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Response Time</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {monitors.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/monitors/${m.id}`}
                          className="font-medium text-zinc-100 hover:text-white hover:underline"
                        >
                          {m.name}
                        </Link>
                        {m.isSimulatedTarget && (
                          <span className="text-[10px] bg-white/5 text-zinc-300 border border-white/10 px-2 py-0.5 rounded-full font-mono">
                            Simulated
                          </span>
                        )}
                        {m.recentReports15m > 0 && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                            {m.recentReports15m} reports
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 truncate max-w-xs">{m.url}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={m.status} size="sm" />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
                      {m.checkIntervalSeconds}s
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
                      {m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleTimeString() : "Never"}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {m.lastResponseTimeMs !== null ? (
                        <span className="font-mono text-zinc-200">{m.lastResponseTimeMs} ms</span>
                      ) : m.lastError ? (
                        <span className="text-rose-400 font-mono">{m.lastError}</span>
                      ) : (
                        <span className="text-zinc-600">&mdash;</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-1.5">
                      <button
                        onClick={() => handleRunCheck(m.id)}
                        disabled={runningChecks.has(m.id)}
                        title="Run check now"
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-white/10 disabled:opacity-40 transition-colors"
                      >
                        <Play className={`w-3.5 h-3.5 ${runningChecks.has(m.id) ? "animate-spin" : ""}`} />
                      </button>
                      <Link
                        to={`/monitors/${m.id}`}
                        title="View details & charts"
                        className="inline-block p-1.5 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to={`/monitors/${m.id}/edit`}
                        title="Edit settings"
                        className="inline-block p-1.5 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setDeleteTargetId(m.id)}
                        title="Delete monitor"
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-full hover:bg-rose-500/10 transition-colors"
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
        </GlassCard>
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
