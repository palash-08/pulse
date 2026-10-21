import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { executeCheck } from "../../src/health/checkService.js";
import * as checker from "../../src/health/checker.js";
import * as dispatcher from "../../src/modules/alerts/dispatcher.js";
import { db } from "../../src/db/client.js";
import { users, monitors, healthChecks, incidents } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";

describe("Alert Dispatcher State Transitions in checkService", () => {
  let userId: number;
  let monitorId: number;
  let outageSpy: any;
  let recoverySpy: any;

  beforeAll(async () => {
    // 1. Create a test user
    const [u] = await db
      .insert(users)
      .values({
        email: `transition-test-${Date.now()}@pulse.test`,
        displayName: "Transition Tester",
        passwordHash: "$argon2id$mock",
        isGuest: false,
      })
      .returning();
    userId = u.id;

    // 2. Create a test monitor
    const [m] = await db
      .insert(monitors)
      .values({
        ownerId: userId,
        name: "Transition Test Monitor",
        url: "http://localhost:4100/svc/transition-test",
        checkIntervalSeconds: 60,
      })
      .returning();
    monitorId = m.id;

    outageSpy = vi.spyOn(dispatcher, "dispatchOutageAlert").mockResolvedValue(undefined as any);
    recoverySpy = vi.spyOn(dispatcher, "dispatchRecoveryAlert").mockResolvedValue(undefined as any);
  });

  afterAll(async () => {
    outageSpy.mockRestore();
    recoverySpy.mockRestore();

    await db.delete(healthChecks).where(eq(healthChecks.monitorId, monitorId));
    await db.delete(incidents).where(eq(incidents.monitorId, monitorId));
    await db.delete(monitors).where(eq(monitors.id, monitorId));
    await db.delete(users).where(eq(users.id, userId));
  });

  it("detects transition from UP to DOWN and dispatches outage alert", async () => {
    // Initially simulate successful check
    const checkSpy = vi.spyOn(checker, "performHealthCheck").mockResolvedValueOnce({
      isSuccessful: true,
      statusCode: 200,
      responseTimeMs: 25,
      errorSummary: null,
    });

    await executeCheck(monitorId, "manual");
    expect(outageSpy).not.toHaveBeenCalled();

    // Now simulate failed check (DOWN transition)
    checkSpy.mockResolvedValueOnce({
      isSuccessful: false,
      statusCode: null,
      responseTimeMs: 5,
      errorSummary: "Connection refused",
    });

    await executeCheck(monitorId, "manual");
    expect(outageSpy).toHaveBeenCalledTimes(1);
    expect(outageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        monitorId,
        ownerId: userId,
        errorSummary: "Connection refused",
      })
    );
  });

  it("detects transition from DOWN to UP and dispatches recovery alert", async () => {
    // Simulate successful check after failure (Recovery transition)
    const checkSpy = vi.spyOn(checker, "performHealthCheck").mockResolvedValueOnce({
      isSuccessful: true,
      statusCode: 200,
      responseTimeMs: 30,
      errorSummary: null,
    });

    await executeCheck(monitorId, "manual");
    expect(recoverySpy).toHaveBeenCalledTimes(1);
    expect(recoverySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        monitorId,
        ownerId: userId,
      })
    );
  });

  it("shares in-flight check promise when concurrent checks occur on the same monitor", async () => {
    let resolveCheck: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveCheck = resolve;
    });

    const checkSpy = vi.spyOn(checker, "performHealthCheck").mockImplementationOnce(() => pendingPromise as any);

    // Start check 1 (in-flight)
    const p1 = executeCheck(monitorId, "scheduled");
    // Start check 2 concurrently
    const p2 = executeCheck(monitorId, "manual");

    // Both should receive the exact same resolved check
    resolveCheck!({
      isSuccessful: true,
      statusCode: 200,
      responseTimeMs: 20,
      errorSummary: null,
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.check?.id).toBe(r2.check?.id);
    expect(checkSpy).toHaveBeenCalledTimes(1);
  });
});
