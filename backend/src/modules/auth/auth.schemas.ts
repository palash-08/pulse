import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(10, "Password must be at least 10 characters").max(128),
  displayName: z.string().min(1, "Display name cannot be empty").max(80),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});
