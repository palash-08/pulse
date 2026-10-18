import { z } from "zod";

export const createMonitorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  url: z.string().url("Must be a valid URL").max(2048),
  checkIntervalSeconds: z.coerce.number().int().min(30).max(3600).default(60),
});

export const updateMonitorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().max(2048).optional(),
  checkIntervalSeconds: z.coerce.number().int().min(30).max(3600).optional(),
});

export const listMonitorsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["up", "down", "unknown"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const historyQuerySchema = z.object({
  result: z.enum(["up", "down"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const rangeQuerySchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("7d"),
});
