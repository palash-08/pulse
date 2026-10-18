import { z } from "zod";

export const updateAccountSchema = z.object({
  displayName: z.string().min(1, "Display name cannot be empty").max(80),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, "Password must be at least 10 characters").max(128),
});

export const deleteAccountSchema = z.object({
  password: z.string().optional(),
});
