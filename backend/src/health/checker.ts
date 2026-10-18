import http from "http";
import https from "https";
import { env } from "../config/env.js";
import { validateUrlForSsrf } from "./ssrfGuard.js";

export interface CheckResult {
  isSuccessful: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorSummary: string | null;
}

const MAX_REDIRECTS = 3;

export async function performHealthCheck(initialUrl: string): Promise<CheckResult> {
  const startTime = Date.now();
  let currentUrl = initialUrl;
  let redirectsCount = 0;

  while (redirectsCount <= MAX_REDIRECTS) {
    let parsedUrl: URL;
    try {
      parsedUrl = await validateUrlForSsrf(currentUrl);
    } catch (err: any) {
      return {
        isSuccessful: false,
        statusCode: null,
        responseTimeMs: null,
        errorSummary: `SSRF check failed: ${err.message}`,
      };
    }

    const isHttps = parsedUrl.protocol === "https:";
    const requestModule = isHttps ? https : http;

    try {
      const result = await new Promise<
        | { type: "redirect"; nextUrl: string; responseTime: number }
        | { type: "done"; statusCode: number; responseTime: number }
      >((resolve, reject) => {
        const req = requestModule.request(
          parsedUrl,
          {
            method: "GET",
            headers: {
              "User-Agent": "Pulse-HealthChecker/2.0 (+https://pulse.local)",
              Accept: "*/*",
            },
            timeout: env.CHECK_TIMEOUT_MS,
          },
          (res) => {
            const responseTime = Date.now() - startTime;
            const statusCode = res.statusCode || 0;

            // Handle redirects (301, 302, 303, 307, 308)
            if (
              [301, 302, 303, 307, 308].includes(statusCode) &&
              res.headers.location
            ) {
              const redirectUrl = new URL(res.headers.location, parsedUrl).toString();
              res.resume(); // Discard response data
              return resolve({ type: "redirect", nextUrl: redirectUrl, responseTime });
            }

            // Immediately discard body beyond 64KB and complete check
            let bytesRead = 0;
            res.on("data", (chunk) => {
              bytesRead += chunk.length;
              if (bytesRead > 65536) {
                req.destroy();
              }
            });

            res.on("end", () => {
              resolve({ type: "done", statusCode, responseTime });
            });

            res.on("close", () => {
              resolve({ type: "done", statusCode, responseTime });
            });
          }
        );

        req.on("timeout", () => {
          req.destroy(new Error(`Connection timed out after ${env.CHECK_TIMEOUT_MS}ms`));
        });

        req.on("error", (err) => {
          reject(err);
        });

        req.end();
      });

      if (result.type === "redirect") {
        redirectsCount++;
        if (redirectsCount > MAX_REDIRECTS) {
          return {
            isSuccessful: false,
            statusCode: 310,
            responseTimeMs: result.responseTime,
            errorSummary: "Too many redirects (max 3 allowed)",
          };
        }
        currentUrl = result.nextUrl;
        continue;
      }

      // Check succeeded or completed with a status code
      const isSuccessful = result.statusCode >= 200 && result.statusCode < 400;
      return {
        isSuccessful,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTime,
        errorSummary: isSuccessful ? null : `HTTP ${result.statusCode}`,
      };
    } catch (err: any) {
      const responseTime = Date.now() - startTime;
      const isTimeout =
        err.message?.includes("timed out") || err.code === "ECONNTIMEOUT" || err.code === "ETIMEDOUT";

      return {
        isSuccessful: false,
        statusCode: null,
        responseTimeMs: isTimeout ? null : responseTime,
        errorSummary: err.message || "Network error",
      };
    }
  }

  return {
    isSuccessful: false,
    statusCode: null,
    responseTimeMs: null,
    errorSummary: "Maximum redirect limit exceeded",
  };
}
