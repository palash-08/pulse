import { apiClient } from "./client.js";
import { AlertContact, AlertLog, PaginatedResponse } from "./types.js";

export function listAlertContacts() {
  return apiClient.get<{ contacts: AlertContact[] }>("/alerts/contacts");
}

export function createAlertContact(data: {
  name: string;
  webhookUrl: string;
  cooldownMinutes?: number;
  notifyOnDown?: boolean;
  notifyOnRecovery?: boolean;
  notifyOnSslExpiry?: boolean;
}) {
  return apiClient.post<{ contact: AlertContact }>("/alerts/contacts", data);
}

export function updateAlertContact(
  id: number,
  data: Partial<{
    name: string;
    webhookUrl: string;
    isActive: boolean;
    cooldownMinutes: number;
    notifyOnDown: boolean;
    notifyOnRecovery: boolean;
    notifyOnSslExpiry: boolean;
  }>
) {
  return apiClient.patch<{ contact: AlertContact }>(`/alerts/contacts/${id}`, data);
}

export function deleteAlertContact(id: number) {
  return apiClient.delete<void>(`/alerts/contacts/${id}`);
}

export function testAlertContact(id: number) {
  return apiClient.post<{ success: boolean; statusCode: number; error?: string }>(
    `/alerts/contacts/${id}/test`
  );
}

export function listAlertLogs(params?: {
  page?: number;
  pageSize?: number;
  monitorId?: number;
}) {
  return apiClient.get<PaginatedResponse<AlertLog>>("/alerts/logs", params);
}
