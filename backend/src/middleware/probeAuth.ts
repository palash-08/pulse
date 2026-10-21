import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { UnauthenticatedError } from "../lib/errors.js";

export function probeAuth(req: Request, _res: Response, next: NextFunction) {
  const headerKey = req.headers["x-probe-key"];
  const authHeader = req.headers.authorization;

  let providedKey: string | undefined;

  if (typeof headerKey === "string") {
    providedKey = headerKey.trim();
  } else if (authHeader && authHeader.startsWith("Bearer ")) {
    providedKey = authHeader.slice(7).trim();
  }

  if (!providedKey || providedKey !== env.INTERNAL_PROBE_API_KEY) {
    return next(new UnauthenticatedError("Invalid or missing probe API key"));
  }

  next();
}
