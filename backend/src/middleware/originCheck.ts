import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function originCheck(req: Request, _res: Response, next: NextFunction) {
  // Public endpoints and internal probe API endpoints have no origin check
  if (
    req.path.startsWith("/api/public") ||
    req.path === "/api/health" ||
    req.path.startsWith("/api/internal")
  ) {
    return next();
  }

  // Safe HTTP methods do not mutate state
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;

  // In production, reject if origin is missing on mutating requests
  if (env.NODE_ENV === "production") {
    if (!origin || origin !== env.FRONTEND_ORIGIN) {
      return next(new AppError("ORIGIN_NOT_ALLOWED", "Cross-origin request rejected", 403));
    }
  } else {
    // In development, if origin is provided, check it matches FRONTEND_ORIGIN or localhost
    if (origin && origin !== env.FRONTEND_ORIGIN && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return next(new AppError("ORIGIN_NOT_ALLOWED", "Cross-origin request rejected", 403));
    }
  }

  next();
}
