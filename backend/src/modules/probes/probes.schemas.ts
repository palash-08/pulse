import { z } from "zod";

export const checkResultItemSchema = z.object({
  monitorId: z.coerce.number().int().positive(),
  isSuccessful: z.boolean(),
  statusCode: z.coerce.number().int().min(100).max(599).nullable().optional(),
  responseTimeMs: z.coerce.number().int().nonnegative().nullable().optional(),
  errorSummary: z.string().trim().max(500).nullable().optional(),
  checkedAt: z.string().datetime().optional(),
});

export const submitCheckResultsSchema = z.object({
  probeId: z.string().trim().min(1, "probeId is required").max(100),
  region: z.string().trim().min(1, "region is required").max(100),
  probeName: z.string().trim().max(100).optional(),
  results: z.array(checkResultItemSchema).min(1, "At least one check result is required").max(1000),
});

export const getMonitorsQuerySchema = z.object({
  region: z.string().trim().max(100).optional(),
});

export type SubmitCheckResultsInput = z.infer<typeof submitCheckResultsSchema>;
export type CheckResultItem = z.infer<typeof checkResultItemSchema>;
