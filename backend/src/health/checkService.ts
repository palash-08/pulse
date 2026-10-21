import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { healthChecks, monitors, sslChecks } from "../db/schema.js";
import { performHealthCheck } from "./checker.js";
import { getMonitorStatus } from "../db/queries/monitors.js";
import { getOpenIncident } from "../db/queries/incidents.js";
import { NotFoundError } from "../lib/errors.js";
import { dispatchOutageAlert, dispatchRecoveryAlert } from "../modules/alerts/dispatcher.js";
import { executeSslCheck } from "./sslService.js";
import { logger } from "../lib/logger.js";

// Tracks in-flight check promises to prevent overlapping checks on the same monitor
const inFlightChecks = new Map<number, Promise<any>>();

export async function executeCheck(
  monitorId: number,
  triggerSource: "scheduled" | "manual" = "manual",
  expectedOwnerId?: number
) {
  // Synchronous in-flight check lookup to prevent concurrent probe races
  const existingCheck = inFlightChecks.get(monitorId);
  if (existingCheck) {
    if (expectedOwnerId !== undefined) {
      const [m] = await db
        .select({ ownerId: monitors.ownerId })
        .from(monitors)
        .where(eq(monitors.id, monitorId));
      if (!m || m.ownerId !== expectedOwnerId) {
        throw new NotFoundError("Monitor not found");
      }
    }
    logger.info(
      `Probe for monitor ${monitorId} already in-flight. Sharing result with ${triggerSource} check.`
    );
    return await existingCheck;
  }

  const checkExecution = (async () => {
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

    // Check if an incident is currently open prior to this check
    const openIncidentBefore = await getOpenIncident(monitorId);

    // 2. Perform network check OUTSIDE of any database transaction
    const checkResult = await performHealthCheck(monitorRecord.url);

    // 3. Insert health check row (trigger updates incidents and monitor state)
    const [insertedCheck] = await db
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

    // Read back monitor summary and open incident AFTER check is committed so trigger changes are visible
    const monitorSummary = await getMonitorStatus(monitorRecord.ownerId, monitorId);
    const openIncident = await getOpenIncident(monitorId);

    const result = {
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

    // 4. Alert dispatching on incident state transitions
    if (!openIncidentBefore && result.openIncident) {
      // Transition: UP -> DOWN (new outage opened)
      dispatchOutageAlert({
        monitorId,
        ownerId: monitorRecord.ownerId,
        incidentId: result.openIncident.id,
        statusCode: checkResult.statusCode,
        errorSummary: checkResult.errorSummary,
        startedAt: new Date(result.openIncident.startedAt),
      }).catch((err) => logger.error("Error dispatching outage alert:", err));
    } else if (openIncidentBefore && !result.openIncident) {
      // Transition: DOWN -> UP (outage resolved)
      const durationSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(openIncidentBefore.startedAt).getTime()) / 1000)
      );
      dispatchRecoveryAlert({
        monitorId,
        ownerId: monitorRecord.ownerId,
        incidentId: openIncidentBefore.id,
        durationSeconds,
        responseTimeMs: checkResult.responseTimeMs,
        resolvedAt: new Date(),
      }).catch((err) => logger.error("Error dispatching recovery alert:", err));
    }

    // 5. If HTTPS, perform or refresh SSL check if needed (e.g. manual check or older than 12h)
    if (monitorRecord.url.toLowerCase().startsWith("https://")) {
      const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
      const [recentSsl] = await db
        .select({ checkedAt: sslChecks.checkedAt })
        .from(sslChecks)
        .where(eq(sslChecks.monitorId, monitorId))
        .orderBy(eq(sslChecks.checkedAt, sslChecks.checkedAt))
        .limit(1);

      const isStale =
        !recentSsl ||
        triggerSource === "manual" ||
        Date.now() - new Date(recentSsl.checkedAt).getTime() > TWELVE_HOURS_MS;

      if (isStale) {
        executeSslCheck(monitorId).catch((err) =>
          logger.error(`Error in automated SSL check for monitor ${monitorId}:`, err)
        );
      }
    }

    return result;
  })();

  inFlightChecks.set(monitorId, checkExecution);
  try {
    return await checkExecution;
  } finally {
    inFlightChecks.delete(monitorId);
  }
}
