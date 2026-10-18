import { apiClient } from "./client.js";

export function getPublicReportInfo(token: string) {
  return apiClient.get<{ monitorName: string; status: "up" | "down" | "unknown" }>(
    `/public/report/${token}`
  );
}

export function submitPublicReport(
  token: string,
  data: {
    category: "down" | "slow" | "error" | "other";
    description: string;
    contactEmail?: string;
    website?: string;
  }
) {
  return apiClient.post<{ id: number }>(`/public/report/${token}`, data);
}
