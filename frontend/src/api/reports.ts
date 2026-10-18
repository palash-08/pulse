import { apiClient } from "./client.js";
import { ProblemReport, PaginatedResponse } from "./types.js";

export function listProblemReports(params?: {
  status?: "new" | "acknowledged" | "resolved" | "dismissed";
  monitorId?: number;
  page?: number;
  pageSize?: number;
}) {
  return apiClient.get<PaginatedResponse<ProblemReport>>("/problem-reports", params);
}

export function updateProblemReportStatus(
  id: number,
  status: "acknowledged" | "resolved" | "dismissed"
) {
  return apiClient.patch<{ report: ProblemReport }>(`/problem-reports/${id}`, { status });
}
