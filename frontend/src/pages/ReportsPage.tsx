import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Eye, X, MessageSquare } from "lucide-react";
import { GlassCard, GlassButton, toast } from "glaceui";
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
      toast.success(`Report status updated to ${newStatus}`);
      await fetchReports(true);
    } catch (err: any) {
      toast.error(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "down":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-rose-500/15 text-rose-300 border border-rose-500/30">Down</span>;
      case "slow":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">Slow</span>;
      case "error":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">Error</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase bg-white/5 text-zinc-300 border border-white/10">Other</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-tight">User Problem Reports</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Public issue reports submitted by end-users through monitor report links
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap p-1 bg-black/40 border border-white/10 rounded-full backdrop-blur-md">
          {(["all", "new", "acknowledged", "resolved", "dismissed"] as const).map((st) => {
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
        <ErrorState message={error} onRetry={() => fetchReports()} />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No problem reports found"
          description={
            statusFilter
              ? `No ${statusFilter} reports found matching your filter.`
              : "Enable a report link on any monitor to allow visitors to submit feedback."
          }
          icon={<MessageSquare className="w-8 h-8 text-zinc-500" />}
        />
      ) : (
        <GlassCard tone="dark" className="p-0 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {reports.map((r) => (
            <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-white/[0.03] transition-colors">
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/monitors/${r.monitorId}`}
                    className="font-medium text-zinc-100 hover:text-white hover:underline text-sm"
                  >
                    {r.monitorName}
                  </Link>
                  {getCategoryBadge(r.category)}
                  <span
                    className={`text-[10px] font-medium uppercase px-2.5 py-0.5 rounded-full border ${
                      r.status === "new"
                        ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                        : r.status === "acknowledged"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : r.status === "resolved"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-white/5 text-zinc-400 border-white/10"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 whitespace-pre-wrap">{r.description}</p>

                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                  <span>Report #{r.id}</span>
                  <span>&bull; {new Date(r.createdAt).toLocaleString()}</span>
                  {r.reporterEmail && <span>&bull; Reporter: {r.reporterEmail}</span>}
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                {r.status === "new" && (
                  <GlassButton
                    tone="dark"
                    size="sm"
                    onClick={() => handleUpdateStatus(r.id, "acknowledged")}
                    disabled={updatingId === r.id}
                    title="Acknowledge issue"
                    className="gap-1 text-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ack</span>
                  </GlassButton>
                )}

                {(r.status === "new" || r.status === "acknowledged") && (
                  <GlassButton
                    tone="dark"
                    size="sm"
                    onClick={() => handleUpdateStatus(r.id, "resolved")}
                    disabled={updatingId === r.id}
                    title="Mark resolved"
                    className="gap-1 text-xs text-emerald-400"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </GlassButton>
                )}

                {r.status !== "dismissed" && r.status !== "resolved" && (
                  <button
                    onClick={() => handleUpdateStatus(r.id, "dismissed")}
                    disabled={updatingId === r.id}
                    title="Dismiss report"
                    className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
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
        </GlassCard>
      )}
    </div>
  );
}
