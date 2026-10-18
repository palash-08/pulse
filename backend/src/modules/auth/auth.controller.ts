import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service.js";

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const existingGuestId = req.user?.isGuest ? req.user.id : undefined;
    const user = await authService.register({
      ...req.body,
      guestUserId: existingGuestId,
    });

    // Session fixation protection: regenerate session id
    await regenerateSession(req);
    req.session.userId = user.id;

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.login(req.body.email, req.body.password);

    await regenerateSession(req);
    req.session.userId = user.id;

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie("pulse.sid");
    res.status(204).end();
  });
}

export async function guestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    // If already in a valid session, return existing user
    if (req.user) {
      return res.status(200).json({ user: req.user });
    }

    const user = await authService.createGuest();

    await regenerateSession(req);
    req.session.userId = user.id;

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function meHandler(req: Request, res: Response) {
  // populateUser and requireUser already ensured req.user exists
  res.status(200).json({ user: req.user });
}
