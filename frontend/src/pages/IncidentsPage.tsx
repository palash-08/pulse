import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
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
          <h1 className="text-3xl font-serif font-bold text-neutral-900 tracking-tight">Incidents History</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Downtime events automatically generated and resolved by PostgreSQL triggers
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(["all", "open", "resolved"] as const).map((st) => {
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
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-xs">
              <thead className="bg-neutral-50/75 text-neutral-500 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left">Incident</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Status</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Started At</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Resolved At</th>
                  <th scope="col" className="px-6 py-3.5 text-left">Duration</th>
                  <th scope="col" className="px-6 py-3.5 text-left">First Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/monitors/${inc.monitorId}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {inc.monitorName}
                      </Link>
                      <div className="text-[11px] text-neutral-400">
                        Incident #{inc.id} &bull; {inc.failedChecks} failed checks
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {inc.status === "open" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Open Outage
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Resolved
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-600 font-mono">
                      {new Date(inc.startedAt).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-600 font-mono">
                      {inc.resolvedAt ? (
                        new Date(inc.resolvedAt).toLocaleString()
                      ) : (
                        <span className="text-rose-600 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Ongoing
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-neutral-800">
                      {inc.durationSeconds >= 60
                        ? `${Math.floor(inc.durationSeconds / 60)}m ${inc.durationSeconds % 60}s`
                        : `${inc.durationSeconds}s`}
                    </td>

                    <td className="px-6 py-4 text-xs text-rose-600 font-mono max-w-xs">
                      <span className="truncate block max-w-[260px]" title={inc.firstError || undefined}>{inc.firstError || "—"}</span>
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
        </div>
      )}
    </div>
  );
}
