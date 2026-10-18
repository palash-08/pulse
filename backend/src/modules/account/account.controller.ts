import { Request, Response, NextFunction } from "express";
import * as accountService from "./account.service.js";

export async function updateProfileHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await accountService.updateProfile(req.user!.id, req.body.displayName);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await accountService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function deleteAccountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await accountService.deleteAccount(req.user!.id, req.body.password);
    req.session.destroy(() => {});
    res.clearCookie("pulse.sid");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
