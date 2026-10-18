import { apiClient } from "./client.js";
import { User } from "./types.js";

export function updateAccount(data: { displayName: string }) {
  return apiClient.patch<{ user: User }>("/account", data);
}

export function changePassword(data: { currentPassword: string; newPassword: string }) {
  return apiClient.post<void>("/account/password", data);
}

export function deleteAccount(data: { password?: string }) {
  return apiClient.delete<void>("/account", data);
}
