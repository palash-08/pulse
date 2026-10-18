import { sql } from "drizzle-orm";
import { db } from "../client.js";

export interface IncidentItem {
  id: number;
  monitorId: number;
  monitorName: string;
  status: "open" | "resolved";
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number;
  failedChecks: number;
  firstError: string | null;
}

/**
 * List incidents from v_incident_details, scoped to owner.
 */
export async function listIncidents(
  ownerId: number,
  options: {
    status?: "open" | "resolved";
    monitorId?: number;
    page?: number;
    pageSize?: number;
  }
): Promise<{ items: IncidentItem[]; total: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const status = options.status ?? null;
  const monitorId = options.monitorId ?? null;

  const itemsResult = await db.execute<any>(sql`
    SELECT
      incident_id AS id,
      monitor_id AS "monitorId",
      monitor_name AS "monitorName",
      status,
      started_at AS "startedAt",
      resolved_at AS "resolvedAt",
      duration_seconds AS "durationSeconds",
      COALESCE(failed_checks, 0)::integer AS "failedChecks",
      first_error AS "firstError"
    FROM v_incident_details
    WHERE owner_id = ${ownerId}
      AND (${status}::varchar IS NULL OR status = ${status})
      AND (${monitorId}::integer IS NULL OR monitor_id = ${monitorId})
    ORDER BY started_at DESC
    LIMIT ${pageSize} OFFSET ${offset};
  `);

  const countResult = await db.execute<{ total: string }>(sql`
    SELECT COUNT(*)::integer AS total
    FROM v_incident_details
    WHERE owner_id = ${ownerId}
      AND (${status}::varchar IS NULL OR status = ${status})
      AND (${monitorId}::integer IS NULL OR monitor_id = ${monitorId});
  `);

  return {
    items: itemsResult.rows as IncidentItem[],
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

/**
 * Get the currently open incident for a monitor, if any.
 */
export async function getOpenIncident(monitorId: number): Promise<IncidentItem | null> {
  const result = await db.execute<any>(sql`
    SELECT
      incident_id AS id,
      monitor_id AS "monitorId",
      monitor_name AS "monitorName",
      status,
      started_at AS "startedAt",
      resolved_at AS "resolvedAt",
      duration_seconds AS "durationSeconds",
      COALESCE(failed_checks, 0)::integer AS "failedChecks",
      first_error AS "firstError"
    FROM v_incident_details
    WHERE monitor_id = ${monitorId} AND status = 'open'
    LIMIT 1;
  `);

  return (result.rows[0] as IncidentItem) ?? null;
}

/**
 * GROUP BY + HAVING: monitors with repeated incidents in the last 30 days.
 */
export async function getRepeatedIncidents(ownerId: number): Promise<
  Array<{
    id: number;
    name: string;
    incidentCount: number;
    avgMinutesToResolve: number;
  }>
> {
  const result = await db.execute<{
    id: number;
    name: string;
    incident_count: string;
    avg_minutes_to_resolve: string;
  }>(sql`
    SELECT
      m.id,
      m.name,
      COUNT(i.id)::integer AS incident_count,
      COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(i.resolved_at, now()) - i.started_at)) / 60), 1), 0) AS avg_minutes_to_resolve
    FROM monitors m
    JOIN incidents i ON i.monitor_id = m.id
    WHERE m.owner_id = ${ownerId}
      AND i.started_at >= now() - interval '30 days'
    GROUP BY m.id, m.name
    HAVING COUNT(i.id) >= 2
    ORDER BY incident_count DESC;
  `);

  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    incidentCount: Number(r.incident_count),
    avgMinutesToResolve: Number(r.avg_minutes_to_resolve),
  }));
}
