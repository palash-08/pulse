import { apiClient } from "./client.js";
import {
  MonitorSummary,
  Check,
  Incident,
  ChartData,
  UptimeSummary,
  PaginatedResponse,
} from "./types.js";

export function listMonitors(params?: {
  search?: string;
  status?: "up" | "down" | "unknown";
  page?: number;
  pageSize?: number;
}) {
  return apiClient.get<PaginatedResponse<MonitorSummary>>("/monitors", params);
}

export function getMonitor(id: number) {
  return apiClient.get<{ monitor: MonitorSummary; openIncident: Incident | null }>(
    `/monitors/${id}`
  );
}

export function createMonitor(data: {
  name: string;
  url: string;
  checkIntervalSeconds?: number;
}) {
  return apiClient.post<{ monitor: MonitorSummary }>("/monitors", data);
}

export function updateMonitor(
  id: number,
  data: {
    name?: string;
    url?: string;
    checkIntervalSeconds?: number;
  }
) {
  return apiClient.patch<{ monitor: MonitorSummary }>(`/monitors/${id}`, data);
}

export function deleteMonitor(id: number) {
  return apiClient.delete<void>(`/monitors/${id}`);
}

export function runManualCheck(id: number) {
  return apiClient.post<{
    check: Check;
    monitor: MonitorSummary;
    openIncident: Incident | null;
  }>(`/monitors/${id}/check`);
}

export function getMonitorHistory(
  id: number,
  params?: {
    result?: "up" | "down";
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }
) {
  return apiClient.get<PaginatedResponse<Check>>(`/monitors/${id}/history`, params);
}

export function getMonitorSummary(id: number, range: "24h" | "7d" | "30d" = "7d") {
  return apiClient.get<UptimeSummary>(`/monitors/${id}/summary`, { range });
}

export function getMonitorResponseTimes(id: number, range: "24h" | "7d" | "30d" = "7d") {
  return apiClient.get<ChartData>(`/monitors/${id}/response-times`, { range });
}

export function enableReportLink(id: number) {
  return apiClient.post<{ reportUrl: string; token: string }>(
    `/monitors/${id}/report-link`
  );
}

export function disableReportLink(id: number) {
  return apiClient.delete<void>(`/monitors/${id}/report-link`);
}
