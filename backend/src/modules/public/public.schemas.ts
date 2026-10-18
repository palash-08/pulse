import { z } from "zod";

export const publicReportSubmissionSchema = z.object({
  category: z.enum(["down", "slow", "error", "other"]),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
  contactEmail: z.string().email().max(255).optional().or(z.literal("")),
  website: z.string().max(100).optional(), // Honeypot field - must be empty
});
