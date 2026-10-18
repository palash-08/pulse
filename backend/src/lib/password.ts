import bcrypt from "bcrypt";

let argon2: any = null;
try {
  argon2 = await import("argon2");
} catch {
  // Argon2 native module unavailable, bcrypt will be used.
}

export async function hashPassword(password: string): Promise<string> {
  if (argon2) {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });
    } catch {
      // Fallback if argon2 call fails
    }
  }
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$argon2")) {
    if (argon2) {
      try {
        return await argon2.verify(hash, password);
      } catch {
        return false;
      }
    }
    // Cannot verify argon2 hash without argon2 module
    return false;
  }
  // Standard bcrypt hash starts with $2a$, $2b$, or $2y$
  return await bcrypt.compare(password, hash);
}
