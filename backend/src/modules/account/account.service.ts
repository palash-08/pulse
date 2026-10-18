import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users, userSessions } from "../../db/schema.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { InvalidCredentialsError, NotFoundError } from "../../lib/errors.js";

export async function updateProfile(userId: number, displayName: string) {
  const [updated] = await db
    .update(users)
    .set({ displayName: displayName.trim() })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw new NotFoundError("User not found");
  }

  return {
    id: updated.id,
    email: updated.email,
    displayName: updated.displayName,
    isGuest: updated.isGuest,
    monitorLimit: updated.isGuest ? 2 : null,
  };
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.passwordHash) {
    throw new NotFoundError("User not found");
  }

  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) {
    throw new InvalidCredentialsError("Current password is incorrect");
  }

  const newHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
}

export async function deleteAccount(userId: number, password?: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Registered users must provide correct password to delete account
  if (!user.isGuest) {
    if (!password) {
      throw new InvalidCredentialsError("Password is required to delete registered account");
    }
    const matches = await verifyPassword(password, user.passwordHash || "");
    if (!matches) {
      throw new InvalidCredentialsError("Password is incorrect");
    }
  }

  // In one transaction: delete sessions and delete user row (cascades to monitors, checks, incidents, reports)
  await db.transaction(async (tx) => {
    // connect-pg-simple stores session json in "sess" column with "userId" inside
    await tx.execute(
      sql`DELETE FROM user_sessions WHERE (sess->>'userId')::integer = ${userId}`
    );
    await tx.delete(users).where(eq(users.id, userId));
  });
}
