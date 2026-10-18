import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Check for PostgreSQL trigger guest limit error (GL001)
  const pgCode = err.code || err.cause?.code;
  if (pgCode === "GL001") {
    return res.status(403).json({
      error: {
        code: "GUEST_LIMIT_REACHED",
        message: "Guest accounts can monitor at most 2 sites. Please register to add more.",
      },
    });
  }

  // Unique constraint violation in PostgreSQL (23505)
  if (pgCode === "23505") {
    const constraint = err.constraint || err.cause?.constraint || "";
    if (constraint.includes("monitors_owner_url_uq")) {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_URL",
          message: "You are already monitoring this URL.",
        },
      });
    }
    if (constraint.includes("email")) {
      return res.status(409).json({
        error: {
          code: "EMAIL_TAKEN",
          message: "This email address is already registered.",
        },
      });
    }
  }

  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Unhandled / Internal errors
  logger.error("Unhandled error:", err);

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    },
  });
}
