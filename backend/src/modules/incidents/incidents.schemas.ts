import { z } from "zod";

export const listIncidentsQuerySchema = z.object({
  status: z.enum(["open", "resolved"]).optional(),
  monitorId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
