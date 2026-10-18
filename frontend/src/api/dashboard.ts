import { apiClient } from "./client.js";
import { DashboardData } from "./types.js";

export function getDashboard() {
  return apiClient.get<DashboardData>("/dashboard");
}
