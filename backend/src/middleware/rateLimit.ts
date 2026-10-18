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
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.keyGenerator(req);
      const now = Date.now();
      const record = this.store.get(key);

      if (!record || record.resetAt <= now) {
        this.store.set(key, { count: 1, resetAt: now + this.windowMs });
        return next();
      }

      if (record.count >= this.maxRequests) {
        const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
        res.setHeader("Retry-After", String(retryAfterSeconds));
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

const isDev = process.env.NODE_ENV !== "production";

function isLocalIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip === "localhost" ||
    ip === "unknown"
  );
}

// Rate limiters as per architecture specification with dev & testing relaxations
export const loginRateLimit = new MemoryRateLimiter(
  15 * 60 * 1000, // 15 minutes
  isDev ? 200 : 15,
  (req) => `login:${getClientIp(req)}:${req.body?.email || ""}`
).middleware();

export const registerRateLimit = new MemoryRateLimiter(
  60 * 60 * 1000, // 1 hour
  isDev ? 200 : 20,
  (req) => `register:${getClientIp(req)}`
).middleware();

export const guestRateLimit = (() => {
  const limiter = new MemoryRateLimiter(
    15 * 60 * 1000, // 15 minutes
    isDev ? 500 : 60,
    (req) => `guest:${getClientIp(req)}`
  );
  const mw = limiter.middleware();
  return (req: Request, res: Response, next: NextFunction) => {
    // If the request already has an active session/user, or is testing on localhost in dev, don't block
    if (req.user || (isDev && isLocalIp(getClientIp(req)))) {
      return next();
    }
    return mw(req, res, next);
  };
})();

export const manualCheckRateLimit = new MemoryRateLimiter(
  60 * 1000, // 1 minute
  isDev ? 120 : 15,
  (req) => `check:${req.user?.id || getClientIp(req)}`
).middleware();

export const publicReportIpRateLimit = new MemoryRateLimiter(
  60 * 60 * 1000, // 1 hour
  isDev ? 100 : 10,
  (req) => `public_report_ip:${getClientIp(req)}`
).middleware();

export const publicReportTokenRateLimit = new MemoryRateLimiter(
  60 * 60 * 1000, // 1 hour
  isDev ? 300 : 60,
  (req) => `public_report_token:${req.params.token}`
).middleware();

