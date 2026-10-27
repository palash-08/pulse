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
import { FlairButton } from "../components/ui/FlairButton.js";

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
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">Down</span>;
      case "slow":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">Slow</span>;
      case "error":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/60">Error</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">Other</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 dark:text-white tracking-tight transition-colors">
            User Problem Reports
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
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
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${
                  isSelected
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                    : "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden transition-colors">
          {reports.map((r) => (
            <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/monitors/${r.monitorId}`}
                    className="font-medium text-neutral-900 dark:text-white hover:underline text-sm"
                  >
                    {r.monitorName}
                  </Link>
                  {getCategoryBadge(r.category)}
                  <span
                    className={`text-[10px] font-medium uppercase px-2.5 py-0.5 rounded-full border ${
                      r.status === "new"
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/60"
                        : r.status === "acknowledged"
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60"
                        : r.status === "resolved"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{r.description}</p>

                <div className="flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-500">
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
                    className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> Acknowledge
                  </button>
                )}

                {r.status !== "resolved" && r.status !== "dismissed" && (
                  <FlairButton
                    onClick={() => handleUpdateStatus(r.id, "resolved")}
                    disabled={updatingId === r.id}
                    className="px-3 py-1.5 rounded-full border border-neutral-900 dark:border-white text-xs font-medium shadow-xs transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" /> Resolve
                  </FlairButton>
                )}

                {r.status !== "dismissed" && r.status !== "resolved" && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, "dismissed")}
                    disabled={updatingId === r.id}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full flex items-center gap-1 transition-colors"
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
