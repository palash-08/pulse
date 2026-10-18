import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { UnauthenticatedError } from "../lib/errors.js";

export async function populateUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return next();
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        isGuest: users.isGuest,
      })
      .from(users)
      .where(eq(users.id, req.session.userId));

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isGuest: user.isGuest,
        monitorLimit: user.isGuest ? 2 : null,
      };
    } else {
      // User in session does not exist in DB
      req.session.destroy(() => {});
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthenticatedError());
  }
  next();
}

export function requireRegisteredUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new UnauthenticatedError());
  }
  if (req.user.isGuest) {
    return next(new UnauthenticatedError("This action requires a registered account"));
  }
  next();
}
