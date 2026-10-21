import { z } from "zod";

const DISCORD_WEBHOOK_REGEX = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/;

export const createAlertContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  webhookUrl: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .regex(
      DISCORD_WEBHOOK_REGEX,
      "Must be a valid Discord Webhook URL (https://discord.com/api/webhooks/...)"
    ),
  cooldownMinutes: z.coerce.number().int().min(1).max(1440).default(15),
  notifyOnDown: z.boolean().default(true),
  notifyOnRecovery: z.boolean().default(true),
  notifyOnSslExpiry: z.boolean().default(true),
});

export const updateAlertContactSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  webhookUrl: z
    .string()
    .trim()
    .url()
    .regex(
      DISCORD_WEBHOOK_REGEX,
      "Must be a valid Discord Webhook URL (https://discord.com/api/webhooks/...)"
    )
    .optional(),
  isActive: z.boolean().optional(),
  cooldownMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  notifyOnDown: z.boolean().optional(),
  notifyOnRecovery: z.boolean().optional(),
  notifyOnSslExpiry: z.boolean().optional(),
});

export const listAlertLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  monitorId: z.coerce.number().int().positive().optional(),
});
