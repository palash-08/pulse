import { apiClient } from "./client.js";
import { User } from "./types.js";

export function register(data: { email: string; password: string; displayName: string }) {
  return apiClient.post<{ user: User }>("/auth/register", data);
}

export function login(data: { email: string; password: string }) {
  return apiClient.post<{ user: User }>("/auth/login", data);
}

export function logout() {
  return apiClient.post<void>("/auth/logout");
}

export function guest() {
  return apiClient.post<{ user: User }>("/auth/guest");
}

export function getMe() {
  return apiClient.get<{ user: User }>("/auth/me");
}
