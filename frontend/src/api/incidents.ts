import { apiClient } from "./client.js";
import { Incident, PaginatedResponse } from "./types.js";

export function listIncidents(params?: {
  status?: "open" | "resolved";
  monitorId?: number;
  page?: number;
  pageSize?: number;
}) {
  return apiClient.get<PaginatedResponse<Incident>>("/incidents", params);
}
