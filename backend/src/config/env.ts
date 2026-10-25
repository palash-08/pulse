import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(16),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  SCHEDULER_ENABLED: z.coerce.boolean().default(true),
  SCHEDULER_TICK_SECONDS: z.coerce.number().default(1),
  CHECK_TIMEOUT_MS: z.coerce.number().default(10000),
  SSRF_ALLOWLIST: z.string().default("localhost:4100,127.0.0.1:4100"),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
