import { z } from "zod";

export const listReportsQuerySchema = z.object({
  status: z.enum(["new", "acknowledged", "resolved", "dismissed"]).optional(),
  monitorId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(["acknowledged", "resolved", "dismissed"]),
});
