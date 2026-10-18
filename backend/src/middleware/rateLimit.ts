import { Request, Response, NextFunction } from "express";
import { RateLimitedError } from "../lib/errors.js";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();

  constructor(
    private readonly windowMs: number,
    private readonly maxRequests: number,
    private readonly keyGenerator: (req: Request) => string
  ) {
    // Periodically clean up expired entries
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (record.resetAt <= now) {
          this.store.delete(key);
        }
      }
    }, 60000).unref();
  }

  middleware() {
    return (req: Request, _res: Response, next: NextFunction) => {
      const key = this.keyGenerator(req);
      const now = Date.now();
      const record = this.store.get(key);

      if (!record || record.resetAt <= now) {
        this.store.set(key, { count: 1, resetAt: now + this.windowMs });
        return next();
      }

      if (record.count >= this.maxRequests) {
        return next(new RateLimitedError());
      }

      record.count += 1;
      next();
    };
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

// Rate limiters as per architecture specification
export const loginRateLimit = new MemoryRateLimiter(
  15 * 60 * 1000, // 15 minutes
  10,
  (req) => `login:${getClientIp(req)}:${req.body?.email || ""}`
).middleware();

export const registerRateLimit = new MemoryRateLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  (req) => `register:${getClientIp(req)}`
).middleware();

export const guestRateLimit = new MemoryRateLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  (req) => `guest:${getClientIp(req)}`
).middleware();

export const manualCheckRateLimit = new MemoryRateLimiter(
  60 * 1000, // 1 minute
  10,
  (req) => `check:${req.user?.id || getClientIp(req)}`
).middleware();

export const publicReportIpRateLimit = new MemoryRateLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  (req) => `public_report_ip:${getClientIp(req)}`
).middleware();

export const publicReportTokenRateLimit = new MemoryRateLimiter(
  60 * 60 * 1000, // 1 hour
  30,
  (req) => `public_report_token:${req.params.token}`
).middleware();
