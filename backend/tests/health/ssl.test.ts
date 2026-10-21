import { describe, it, expect, vi } from "vitest";
import { inspectSslCertificate } from "../../src/health/sslChecker.js";
import { executeSslCheck } from "../../src/health/sslService.js";
import * as sslChecker from "../../src/health/sslChecker.js";
import * as dispatcher from "../../src/modules/alerts/dispatcher.js";
import { db } from "../../src/db/client.js";
import { users, monitors, sslChecks } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";

describe("SSL Certificate Expiry Tracker & Failsafe", () => {
  it("rejects non-HTTPS URLs with clear error message", async () => {
    const result = await inspectSslCertificate("http://example.com");
    expect(result.isValid).toBe(false);
    expect(result.isConnectionError).toBe(true);
    expect(result.errorMessage).toContain("only applicable for HTTPS targets");
    expect(result.daysRemaining).toBeNull();
  });

  it("handles invalid or unreachable TLS hosts gracefully with isConnectionError flag", async () => {
    const result = await inspectSslCertificate("https://nonexistent-domain-xyz-12345.com");
    expect(result.isValid).toBe(false);
    expect(result.isConnectionError).toBe(true);
    expect(result.errorMessage).toBeDefined();
  });

  it("suppresses SSL alerts when check fails due to connection/network errors (Failsafe)", async () => {
    // 1. Create a dummy user & monitor
    const [u] = await db
      .insert(users)
      .values({
        email: `ssl-failsafe-${Date.now()}@pulse.test`,
        displayName: "SSL Tester",
        passwordHash: "$argon2id$mock",
        isGuest: false,
      })
      .returning();

    const [m] = await db
      .insert(monitors)
      .values({
        ownerId: u.id,
        name: "Unreachable SSL Test",
        url: "https://localhost:44300",
      })
      .returning();

    const alertSpy = vi.spyOn(dispatcher, "dispatchSslExpiryAlert").mockResolvedValue(undefined as any);
    const inspectSpy = vi.spyOn(sslChecker, "inspectSslCertificate").mockResolvedValue({
      isValid: false,
      issuer: null,
      subject: null,
      validFrom: null,
      validTo: null,
      daysRemaining: null,
      protocol: null,
      errorMessage: "connect ECONNREFUSED 127.0.0.1:44300",
      isConnectionError: true,
    });

    const result = await executeSslCheck(m.id);
    expect(result.isApplicable).toBe(true);
    expect(result.check?.isValid).toBe(false);

    // Crucial: No SSL alert must be sent for network connection refusal!
    expect(alertSpy).not.toHaveBeenCalled();

    // Clean up
    inspectSpy.mockRestore();
    alertSpy.mockRestore();
    await db.delete(sslChecks).where(eq(sslChecks.monitorId, m.id));
    await db.delete(monitors).where(eq(monitors.id, m.id));
    await db.delete(users).where(eq(users.id, u.id));
  });

  it("dispatches SSL alert only when certificate is confirmed expiring (<= 30 days)", async () => {
    const [u] = await db
      .insert(users)
      .values({
        email: `ssl-confirm-${Date.now()}@pulse.test`,
        displayName: "SSL Confirm Tester",
        passwordHash: "$argon2id$mock",
        isGuest: false,
      })
      .returning();

    const [m] = await db
      .insert(monitors)
      .values({
        ownerId: u.id,
        name: "Expiring SSL Test",
        url: "https://example-expiring.com",
      })
      .returning();

    const alertSpy = vi.spyOn(dispatcher, "dispatchSslExpiryAlert").mockResolvedValue(undefined as any);
    // Both initial check and confirmation retry return expiring cert (15 days left)
    const inspectSpy = vi.spyOn(sslChecker, "inspectSslCertificate").mockResolvedValue({
      isValid: true,
      issuer: "Let's Encrypt",
      subject: "example-expiring.com",
      validFrom: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
      validTo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      daysRemaining: 15,
      protocol: "TLSv1.3",
      errorMessage: null,
      isConnectionError: false,
    });

    const result = await executeSslCheck(m.id);
    expect(result.isApplicable).toBe(true);
    expect(result.check?.daysRemaining).toBe(15);
    expect(alertSpy).toHaveBeenCalledTimes(1);

    // Clean up
    inspectSpy.mockRestore();
    alertSpy.mockRestore();
    await db.delete(sslChecks).where(eq(sslChecks.monitorId, m.id));
    await db.delete(monitors).where(eq(monitors.id, m.id));
    await db.delete(users).where(eq(users.id, u.id));
  });
});
