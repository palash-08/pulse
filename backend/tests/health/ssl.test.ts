import { describe, it, expect } from "vitest";
import { inspectSslCertificate } from "../../src/health/sslChecker.js";

describe("SSL Certificate Expiry Tracker", () => {
  it("rejects non-HTTPS URLs with clear error message", async () => {
    const result = await inspectSslCertificate("http://example.com");
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain("only applicable for HTTPS targets");
    expect(result.daysRemaining).toBeNull();
  });

  it("handles invalid or unreachable TLS hosts gracefully without throwing unhandled exceptions", async () => {
    const result = await inspectSslCertificate("https://nonexistent-domain-xyz-12345.com");
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });
});
