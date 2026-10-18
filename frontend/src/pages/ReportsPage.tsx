import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Eye, X, MessageSquare } from "lucide-react";
import { listProblemReports, updateProblemReportStatus } from "../api/reports.js";
import { ProblemReport } from "../api/types.js";
import { usePolling } from "../hooks/usePolling.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";
import { EmptyState } from "../components/ui/EmptyState.js";
import { Pagination } from "../components/ui/Pagination.js";

export function ReportsPage() {
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "new" | "acknowledged" | "resolved" | "dismissed" | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchReports = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await listProblemReports({
        status: statusFilter,
        page,
        pageSize: 20,
      });
      setReports(res.items);
      setTotal(res.total);
      setError(null);
    } catch (err: any) {
      if (!isBackground) setError(err.message || "Failed to load problem reports");
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter]);

  usePolling(() => fetchReports(true), 15000);

  const handleUpdateStatus = async (
    id: number,
    newStatus: "acknowledged" | "resolved" | "dismissed"
  ) => {
    try {
      setUpdatingId(id);
      await updateProblemReportStatus(id, newStatus);
      await fetchReports(true);
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "down":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">Down</span>;
      case "slow":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Slow</span>;
      case "error":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">Error</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">Other</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Problem Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Public issue reports submitted by end-users through monitor report links
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          {(["all", "new", "acknowledged", "resolved", "dismissed"] as const).map((st) => {
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

      {loading ? (
        <Spinner size="lg" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchReports()} />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No problem reports found"
          description={
            statusFilter
              ? `No ${statusFilter} reports found matching your filter.`
              : "Enable a report link on any monitor to allow visitors to submit feedback."
          }
          icon={<MessageSquare className="w-8 h-8" />}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {reports.map((r) => (
            <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/monitors/${r.monitorId}`}
                    className="font-semibold text-slate-900 hover:text-blue-600 text-sm"
                  >
                    {r.monitorName}
                  </Link>
                  {getCategoryBadge(r.category)}
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      r.status === "new"
                        ? "bg-blue-100 text-blue-800"
                        : r.status === "acknowledged"
                        ? "bg-amber-100 text-amber-800"
                        : r.status === "resolved"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <p className="text-xs text-slate-700 whitespace-pre-wrap">{r.description}</p>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Report #{r.id}</span>
                  <span>&bull; {new Date(r.createdAt).toLocaleString()}</span>
                  {r.reporterEmail && <span>&bull; Reporter: {r.reporterEmail}</span>}
                </div>
              </div>

              {/* Triage Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                {r.status === "new" && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, "acknowledged")}
                    disabled={updatingId === r.id}
                    className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> Acknowledge
                  </button>
                )}

                {r.status !== "resolved" && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, "resolved")}
                    disabled={updatingId === r.id}
                    className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Resolve
                  </button>
                )}

                {r.status !== "dismissed" && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, "dismissed")}
                    disabled={updatingId === r.id}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}

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
