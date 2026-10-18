import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { healthChecks, monitors } from "../db/schema.js";
import { performHealthCheck } from "./checker.js";
import { getMonitorStatus } from "../db/queries/monitors.js";
import { getOpenIncident } from "../db/queries/incidents.js";
import { NotFoundError } from "../lib/errors.js";

export async function executeCheck(
  monitorId: number,
  triggerSource: "scheduled" | "manual" = "manual",
  expectedOwnerId?: number
) {
  // 1. Fetch monitor and verify ownership if expectedOwnerId is provided
  const [monitorRecord] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, monitorId));

  if (!monitorRecord) {
    throw new NotFoundError("Monitor not found");
  }

  if (expectedOwnerId !== undefined && monitorRecord.ownerId !== expectedOwnerId) {
    throw new NotFoundError("Monitor not found");
  }

  // 2. Perform network check OUTSIDE of any database transaction
  const checkResult = await performHealthCheck(monitorRecord.url);

  // 3. In one transaction: insert health_checks (trigger updates incidents)
  //    and read back v_monitor_status & open incident
  return await db.transaction(async (tx) => {
    const [insertedCheck] = await tx
      .insert(healthChecks)
      .values({
        monitorId,
        isSuccessful: checkResult.isSuccessful,
        statusCode: checkResult.statusCode,
        responseTimeMs: checkResult.responseTimeMs,
        errorSummary: checkResult.errorSummary,
        triggerSource,
      })
      .returning();

    // Read back monitor summary from view
    const monitorSummary = await getMonitorStatus(monitorRecord.ownerId, monitorId);
    // Read back any open incident
    const openIncident = await getOpenIncident(monitorId);

    return {
      check: {
        id: insertedCheck.id,
        monitorId: insertedCheck.monitorId,
        checkedAt: insertedCheck.checkedAt instanceof Date
          ? insertedCheck.checkedAt.toISOString()
          : new Date(insertedCheck.checkedAt).toISOString(),
        isSuccessful: insertedCheck.isSuccessful,
        statusCode: insertedCheck.statusCode,
        responseTimeMs: insertedCheck.responseTimeMs,
        errorSummary: insertedCheck.errorSummary,
        trigger: insertedCheck.triggerSource,
      },
      monitor: monitorSummary,
      openIncident,
    };
  });
}
