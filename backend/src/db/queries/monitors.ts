import { sql } from "drizzle-orm";
import { db } from "../client.js";
import { VMonitorStatus } from "../views.js";

export interface MonitorQueryFilters {
  search?: string;
  status?: "up" | "down" | "unknown";
  page?: number;
  pageSize?: number;
}

/**
 * Search and filter monitors for a user.
 * Reads from v_monitor_status (single view call, no N+1).
 */
export async function listMonitors(
  ownerId: number,
  filters: MonitorQueryFilters
): Promise<{ items: VMonitorStatus[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const search = filters.search?.trim() ? filters.search.trim() : null;
  const status = filters.status ?? null;

  const itemsResult = await db.execute<any>(sql`
    SELECT
      monitor_id AS "monitorId",
      owner_id AS "ownerId",
      name,
      url,
      check_interval_seconds AS "checkIntervalSeconds",
      last_check_id AS "lastCheckId",
      last_checked_at AS "lastCheckedAt",
      last_status_code AS "lastStatusCode",
      last_response_time_ms AS "lastResponseTimeMs",
      last_error_summary AS "lastErrorSummary",
      current_status AS "currentStatus",
      has_open_incident AS "hasOpenIncident",
      open_incident_started_at AS "openIncidentStartedAt",
      recent_reports_15m AS "recentReports15m"
    FROM v_monitor_status
    WHERE owner_id = ${ownerId}
      AND (${search}::text IS NULL OR name ILIKE '%' || ${search} || '%' OR url ILIKE '%' || ${search} || '%')
      AND (${status}::text IS NULL OR current_status = ${status})
    ORDER BY
      CASE current_status
        WHEN 'down' THEN 1
        WHEN 'unknown' THEN 2
        ELSE 3
      END,
      name ASC
    LIMIT ${pageSize} OFFSET ${offset};
  `);

  const countResult = await db.execute<{ total: string }>(sql`
    SELECT COUNT(*)::integer AS total
    FROM v_monitor_status
    WHERE owner_id = ${ownerId}
      AND (${search}::text IS NULL OR name ILIKE '%' || ${search} || '%' OR url ILIKE '%' || ${search} || '%')
      AND (${status}::text IS NULL OR current_status = ${status});
  `);

  const total = Number(countResult.rows[0]?.total ?? 0);
  return {
    items: itemsResult.rows as VMonitorStatus[],
    total,
  };
}

/**
 * Get single monitor status scoped to owner.
 */
export async function getMonitorStatus(
  ownerId: number,
  monitorId: number
): Promise<VMonitorStatus | null> {
  const result = await db.execute<any>(sql`
    SELECT
      monitor_id AS "monitorId",
      owner_id AS "ownerId",
      name,
      url,
      check_interval_seconds AS "checkIntervalSeconds",
      last_check_id AS "lastCheckId",
      last_checked_at AS "lastCheckedAt",
      last_status_code AS "lastStatusCode",
      last_response_time_ms AS "lastResponseTimeMs",
      last_error_summary AS "lastErrorSummary",
      current_status AS "currentStatus",
      has_open_incident AS "hasOpenIncident",
      open_incident_started_at AS "openIncidentStartedAt",
      recent_reports_15m AS "recentReports15m"
    FROM v_monitor_status
    WHERE owner_id = ${ownerId} AND monitor_id = ${monitorId};
  `);

  return (result.rows[0] as VMonitorStatus) ?? null;
}

/**
 * Scheduler query: finds monitors that are due for checking.
 */
export async function getDueMonitors(limit: number = 50): Promise<
  Array<{ monitorId: number; url: string; checkIntervalSeconds: number; name: string }>
> {
  const result = await db.execute<{
    monitor_id: number;
    url: string;
    check_interval_seconds: number;
    name: string;
  }>(sql`
    SELECT monitor_id, url, check_interval_seconds, name
    FROM v_monitor_status
    WHERE last_checked_at IS NULL
       OR last_checked_at + make_interval(secs => check_interval_seconds) <= now()
    ORDER BY last_checked_at NULLS FIRST
    LIMIT ${limit};
  `);

  return result.rows.map((r) => ({
    monitorId: r.monitor_id,
    url: r.url,
    checkIntervalSeconds: r.check_interval_seconds,
    name: r.name,
  }));
}
