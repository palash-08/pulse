import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard.js";
import { listIncidents } from "../api/incidents.js";
import { Incident } from "../api/types.js";
import { usePolling } from "../hooks/usePolling.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";
import { EmptyState } from "../components/ui/EmptyState.js";
import { Pagination } from "../components/ui/Pagination.js";

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await listIncidents({
        status: statusFilter,
        page,
        pageSize: 20,
      });
      setIncidents(res.items);
      setTotal(res.total);
      setError(null);
    } catch (err: any) {
      if (!isBackground) setError(err.message || "Failed to load incidents");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, statusFilter]);

  usePolling(() => fetchIncidents(true), 15000);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">Incidents History</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Downtime events automatically generated and resolved by PostgreSQL triggers
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto p-1 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
          {(["all", "open", "resolved"] as const).map((st) => {
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

      {loading ? (
        <Spinner size="lg" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchIncidents()} />
      ) : incidents.length === 0 ? (
        <EmptyState
          title="No incidents recorded"
          description={
            statusFilter
              ? `No ${statusFilter} incidents found matching your filter.`
              : "Great job! None of your monitors have experienced outages."
          }
        />
      ) : (
        <GlassCard tone="dark" className="overflow-hidden p-0 border border-white/10 rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.06] text-xs">
              <thead className="bg-white/[0.02] text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left">Incident</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Started At</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Resolved At</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Duration</th>
                  <th scope="col" className="px-6 py-3.5 text-left">First Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/monitors/${inc.monitorId}`}
                        className="font-medium text-zinc-100 hover:text-white hover:underline"
                      >
                        {inc.monitorName}
                      </Link>
                      <div className="text-[11px] text-zinc-500">
                        Incident #{inc.id} &bull; {inc.failedChecks} failed checks
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {inc.status === "open" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          Open Outage
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          Resolved
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
                      {new Date(inc.startedAt).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
                      {inc.resolvedAt ? (
                        new Date(inc.resolvedAt).toLocaleString()
                      ) : (
                        <span className="text-rose-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Ongoing
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-zinc-300">
                      {inc.durationSeconds >= 60
                        ? `${Math.floor(inc.durationSeconds / 60)}m ${inc.durationSeconds % 60}s`
                        : `${inc.durationSeconds}s`}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-rose-400 font-mono text-xs truncate max-w-xs">
                      {inc.firstError || "—"}
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
            onPageChange={(p) => setPage(p)}
          />
        </GlassCard>
      )}
    </div>
  );
}
