import { inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { healthChecks, monitors, probeNodes } from "../../db/schema.js";
import { getOpenIncident } from "../../db/queries/incidents.js";
import { dispatchOutageAlert, dispatchRecoveryAlert } from "../alerts/dispatcher.js";
import { logger } from "../../lib/logger.js";
import { SubmitCheckResultsInput } from "./probes.schemas.js";

export async function getMonitorsForProbes(_region?: string) {
  const rows = await db
    .select({
      id: monitors.id,
      name: monitors.name,
      url: monitors.url,
      checkIntervalSeconds: monitors.checkIntervalSeconds,
    })
    .from(monitors);

  return rows;
}

export async function recordProbeResults(input: SubmitCheckResultsInput) {
  const { probeId, region, probeName, results } = input;
  const now = new Date();

  // 1. Upsert probe node registry
  await db
    .insert(probeNodes)
    .values({
      id: probeId,
      region,
      name: probeName || probeId,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: probeNodes.id,
      set: {
        region,
        name: probeName || probeId,
        lastSeenAt: now,
      },
    });

  // 2. Identify distinct monitors in this batch to track incident transitions
  const uniqueMonitorIds = Array.from(new Set(results.map((r) => r.monitorId)));

  // Query open incidents before inserting
  const beforeIncidentsMap = new Map<number, any>();
  const monitorRecordsMap = new Map<number, { ownerId: number }>();

  if (uniqueMonitorIds.length > 0) {
    const monitorRows = await db
      .select({ id: monitors.id, ownerId: monitors.ownerId })
      .from(monitors)
      .where(inArray(monitors.id, uniqueMonitorIds));

    for (const m of monitorRows) {
      monitorRecordsMap.set(m.id, m);
    }

    for (const monitorId of uniqueMonitorIds) {
      const openInc = await getOpenIncident(monitorId);
      beforeIncidentsMap.set(monitorId, openInc);
    }
  }

  // 3. Batch insert health checks with triggerSource: 'probe', probeId, and region
  const checkValues = results
    .filter((r) => monitorRecordsMap.has(r.monitorId))
    .map((r) => ({
      monitorId: r.monitorId,
      isSuccessful: r.isSuccessful,
      statusCode: r.statusCode ?? null,
      responseTimeMs: r.responseTimeMs ?? null,
      errorSummary: r.errorSummary ?? (r.isSuccessful ? null : "Probe reported failure"),
      triggerSource: "probe" as const,
      probeId,
      region,
      checkedAt: r.checkedAt ? new Date(r.checkedAt) : now,
    }));

  if (checkValues.length > 0) {
    await db.insert(healthChecks).values(checkValues);
  }

  // 4. Check incident state transitions for alerts (quorum evaluation happened via Postgres trigger)
  for (const monitorId of uniqueMonitorIds) {
    const monitor = monitorRecordsMap.get(monitorId);
    if (!monitor) continue;

    const before = beforeIncidentsMap.get(monitorId);
    const after = await getOpenIncident(monitorId);

    const checkItem = results.find((r) => r.monitorId === monitorId);

    if (!before && after) {
      // Transition: UP -> DOWN (quorum confirmed outage)
      logger.info(`🚨 Quorum reached outage for monitor ${monitorId} (Probe: ${probeId})`);
      dispatchOutageAlert({
        monitorId,
        ownerId: monitor.ownerId,
        incidentId: after.id,
        statusCode: checkItem?.statusCode,
        errorSummary: checkItem?.errorSummary,
        startedAt: new Date(after.startedAt),
      }).catch((err) => logger.error("Error dispatching probe outage alert:", err));
    } else if (before && !after) {
      // Transition: DOWN -> UP (quorum confirmed recovery)
      logger.info(`✅ Quorum reached recovery for monitor ${monitorId} (Probe: ${probeId})`);
      const durationSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(before.startedAt).getTime()) / 1000)
      );
      dispatchRecoveryAlert({
        monitorId,
        ownerId: monitor.ownerId,
        incidentId: before.id,
        durationSeconds,
        responseTimeMs: checkItem?.responseTimeMs,
        resolvedAt: new Date(),
      }).catch((err) => logger.error("Error dispatching probe recovery alert:", err));
    }
  }

  return {
    recorded: checkValues.length,
    probeId,
    region,
  };
}

export async function getActiveProbes() {
  return await db
    .select()
    .from(probeNodes)
    .orderBy(sql`${probeNodes.lastSeenAt} DESC`);
}
