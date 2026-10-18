import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { EmailTakenError, InvalidCredentialsError } from "../../lib/errors.js";

export async function register(data: {
  email: string;
  password: string;
  displayName: string;
  guestUserId?: number;
}) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const passwordHash = await hashPassword(data.password);

  // If registering from an existing guest session: upgrade that exact row in a transaction
  if (data.guestUserId) {
    return await db.transaction(async (tx) => {
      // 1. Lock and inspect guest row
      const [existingGuest] = await tx
        .select()
        .from(users)
        .where(eq(users.id, data.guestUserId!))
        .for("update");

      if (existingGuest && existingGuest.isGuest) {
        // 2. Check email uniqueness
        const [emailConflict] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, normalizedEmail));

        if (emailConflict) {
          throw new EmailTakenError();
        }

        // 3. In-place upgrade
        const [upgradedUser] = await tx
          .update(users)
          .set({
            email: normalizedEmail,
            displayName: data.displayName.trim(),
            passwordHash,
            isGuest: false,
          })
          .where(eq(users.id, data.guestUserId!))
          .returning();

        return {
          id: upgradedUser.id,
          email: upgradedUser.email,
          displayName: upgradedUser.displayName,
          isGuest: false,
          monitorLimit: null,
        };
      }

      // Guest row not found or not a guest, fallback to fresh registration
      return await createNewRegisteredUser(tx, normalizedEmail, data.displayName, passwordHash);
    });
  }

  return await createNewRegisteredUser(db, normalizedEmail, data.displayName, passwordHash);
}

async function createNewRegisteredUser(
  client: any,
  email: string,
  displayName: string,
  passwordHash: string
) {
  // Check if email taken
  const [existing] = await client
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));

  if (existing) {
    throw new EmailTakenError();
  }

  const [newUser] = await client
    .insert(users)
    .values({
      email,
      displayName: displayName.trim(),
      passwordHash,
      isGuest: false,
    })
    .returning();

  return {
    id: newUser.id,
    email: newUser.email,
    displayName: newUser.displayName,
    isGuest: false,
    monitorLimit: null,
  };
}

export async function login(email: string, plainPassword: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail));

  if (!user || user.isGuest || !user.passwordHash) {
    throw new InvalidCredentialsError();
  }

  const isValid = await verifyPassword(plainPassword, user.passwordHash);
  if (!isValid) {
    throw new InvalidCredentialsError();
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isGuest: false,
    monitorLimit: null,
  };
}

export async function createGuest() {
  const [guest] = await db
    .insert(users)
    .values({
      isGuest: true,
    })
    .returning();

  return {
    id: guest.id,
    email: null,
    displayName: "Guest",
    isGuest: true,
    monitorLimit: 2,
  };
}
