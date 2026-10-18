import { sql } from "drizzle-orm";
import { db } from "../client.js";

export interface DashboardTotals {
  monitors: number;
  up: number;
  down: number;
  unknown: number;
  openIncidents: number;
}

/**
 * Dashboard totals for one user.
 * JOIN-free aggregate over v_monitor_status using COUNT with FILTER.
 */
export async function getDashboardTotals(ownerId: number): Promise<DashboardTotals> {
  const result = await db.execute<{
    monitors: string;
    up: string;
    down: string;
    unknown: string;
    open_incidents: string;
  }>(sql`
    SELECT
      COUNT(*)::integer                                          AS monitors,
      COUNT(*) FILTER (WHERE current_status = 'up')::integer     AS up,
      COUNT(*) FILTER (WHERE current_status = 'down')::integer   AS down,
      COUNT(*) FILTER (WHERE current_status = 'unknown')::integer AS unknown,
      COUNT(*) FILTER (WHERE has_open_incident)::integer         AS open_incidents
    FROM v_monitor_status
    WHERE owner_id = ${ownerId};
  `);

  const row = result.rows[0];
  return {
    monitors: Number(row?.monitors ?? 0),
    up: Number(row?.up ?? 0),
    down: Number(row?.down ?? 0),
    unknown: Number(row?.unknown ?? 0),
    openIncidents: Number(row?.open_incidents ?? 0),
  };
}

/**
 * 24-hour summary across all user's monitors.
 */
export async function getLast24hSummary(ownerId: number): Promise<{
  checks: number;
  uptimePct: number;
  avgResponseMs: number;
}> {
  const result = await db.execute<{
    checks: string;
    uptime_pct: string;
    avg_response_ms: string;
  }>(sql`
    SELECT
      COUNT(*)::integer AS checks,
      COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE hc.is_successful) / NULLIF(COUNT(*), 0), 2), 100.0) AS uptime_pct,
      COALESCE(ROUND(AVG(hc.response_time_ms) FILTER (WHERE hc.is_successful), 0), 0) AS avg_response_ms
    FROM health_checks hc
    JOIN monitors m ON m.id = hc.monitor_id
    WHERE m.owner_id = ${ownerId}
      AND hc.checked_at >= now() - interval '24 hours';
  `);

  const row = result.rows[0];
  return {
    checks: Number(row?.checks ?? 0),
    uptimePct: Number(row?.uptime_pct ?? 100),
    avgResponseMs: Number(row?.avg_response_ms ?? 0),
  };
}
