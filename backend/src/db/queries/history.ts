import { sql } from "drizzle-orm";
import { db } from "../client.js";

export interface CheckItem {
  id: number;
  monitorId: number;
  checkedAt: string;
  isSuccessful: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorSummary: string | null;
  trigger: string;
}

export interface ActivityItem extends CheckItem {
  monitorName: string;
}

export interface ChartBucket {
  bucketStart: string;
  avgMs: number;
  minMs: number;
  maxMs: number;
  checks: number;
  failures: number;
  uptimePct: number;
}

export interface UptimeSummary {
  range: string;
  totalChecks: number;
  successfulChecks: number;
  uptimePct: number;
  avgResponseMs: number;
  minResponseMs: number;
  maxResponseMs: number;
  incidentCount: number;
}

/**
 * Paginated checks history for a specific monitor.
 */
export async function getMonitorHistory(
  monitorId: number,
  options: {
    result?: "up" | "down";
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{ items: CheckItem[]; total: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const isSuccessFilter =
    options.result === "up" ? true : options.result === "down" ? false : null;
  const fromDate = options.from ? new Date(options.from) : null;
  const toDate = options.to ? new Date(options.to) : null;

  const itemsResult = await db.execute<any>(sql`
    SELECT
      id,
      monitor_id AS "monitorId",
      checked_at AS "checkedAt",
      is_successful AS "isSuccessful",
      status_code AS "statusCode",
      response_time_ms AS "responseTimeMs",
      error_summary AS "errorSummary",
      trigger_source AS "trigger"
    FROM health_checks
    WHERE monitor_id = ${monitorId}
      AND (${isSuccessFilter}::boolean IS NULL OR is_successful = ${isSuccessFilter})
      AND (${fromDate}::timestamptz IS NULL OR checked_at >= ${fromDate})
      AND (${toDate}::timestamptz IS NULL OR checked_at <= ${toDate})
    ORDER BY checked_at DESC
    LIMIT ${pageSize} OFFSET ${offset};
  `);

  const countResult = await db.execute<{ total: string }>(sql`
    SELECT COUNT(*)::integer AS total
    FROM health_checks
    WHERE monitor_id = ${monitorId}
      AND (${isSuccessFilter}::boolean IS NULL OR is_successful = ${isSuccessFilter})
      AND (${fromDate}::timestamptz IS NULL OR checked_at >= ${fromDate})
      AND (${toDate}::timestamptz IS NULL OR checked_at <= ${toDate});
  `);

  return {
    items: itemsResult.rows as CheckItem[],
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

/**
 * Recent activity across all of a user's monitors.
 */
export async function getRecentActivity(ownerId: number, limit: number = 10): Promise<ActivityItem[]> {
  const result = await db.execute<any>(sql`
    SELECT
      hc.id,
      hc.monitor_id AS "monitorId",
      m.name AS "monitorName",
      hc.checked_at AS "checkedAt",
      hc.is_successful AS "isSuccessful",
      hc.status_code AS "statusCode",
      hc.response_time_ms AS "responseTimeMs",
      hc.error_summary AS "errorSummary",
      hc.trigger_source AS "trigger"
    FROM health_checks hc
    JOIN monitors m ON m.id = hc.monitor_id
    WHERE m.owner_id = ${ownerId}
    ORDER BY hc.checked_at DESC
    LIMIT ${limit};
  `);

  return result.rows as ActivityItem[];
}

/**
 * Time-bucketed response time & uptime stats for Recharts.
 */
export async function getChartBuckets(
  monitorId: number,
  range: "24h" | "7d" | "30d" = "7d"
): Promise<{ range: string; bucket: "hour" | "day"; points: ChartBucket[] }> {
  // Whitelist unit and interval
  const unit = range === "24h" ? "hour" : "day";
  const intervalString =
    range === "24h" ? "24 hours" : range === "30d" ? "30 days" : "7 days";

  const result = await db.execute<{
    bucket_start: string;
    avg_ms: string | null;
    min_ms: number | null;
    max_ms: number | null;
    checks: string;
    failures: string;
    uptime_pct: string;
  }>(sql`
    SELECT
      date_trunc(${unit}, hc.checked_at) AS bucket_start,
      ROUND(AVG(hc.response_time_ms) FILTER (WHERE hc.is_successful)) AS avg_ms,
      MIN(hc.response_time_ms) FILTER (WHERE hc.is_successful) AS min_ms,
      MAX(hc.response_time_ms) FILTER (WHERE hc.is_successful) AS max_ms,
      COUNT(*)::integer AS checks,
      COUNT(*) FILTER (WHERE NOT hc.is_successful)::integer AS failures,
      COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE hc.is_successful) / COUNT(*), 2), 100.0) AS uptime_pct
    FROM health_checks hc
    WHERE hc.monitor_id = ${monitorId}
      AND hc.checked_at >= now() - ${intervalString}::interval
    GROUP BY 1
    ORDER BY 1;
  `);

  return {
    range,
    bucket: unit,
    points: result.rows.map((r) => ({
      bucketStart: r.bucket_start,
      avgMs: Number(r.avg_ms ?? 0),
      minMs: Number(r.min_ms ?? 0),
      maxMs: Number(r.max_ms ?? 0),
      checks: Number(r.checks ?? 0),
      failures: Number(r.failures ?? 0),
      uptimePct: Number(r.uptime_pct ?? 100),
    })),
  };
}

/**
 * Calls SQL function fn_monitor_uptime_summary for exact statistics.
 */
export async function getUptimeSummary(
  monitorId: number,
  range: "24h" | "7d" | "30d" = "7d"
): Promise<UptimeSummary> {
  const intervalString =
    range === "24h" ? "24 hours" : range === "30d" ? "30 days" : "7 days";

  const result = await db.execute<{
    total_checks: string;
    successful_checks: string;
    uptime_pct: string;
    avg_response_ms: string;
    min_response_ms: number | null;
    max_response_ms: number | null;
    incident_count: string;
  }>(sql`
    SELECT * FROM fn_monitor_uptime_summary(
      ${monitorId},
      now() - ${intervalString}::interval,
      now()
    );
  `);

  const row = result.rows[0];
  return {
    range,
    totalChecks: Number(row?.total_checks ?? 0),
    successfulChecks: Number(row?.successful_checks ?? 0),
    uptimePct: Number(row?.uptime_pct ?? 100),
    avgResponseMs: Number(row?.avg_response_ms ?? 0),
    minResponseMs: Number(row?.min_response_ms ?? 0),
    maxResponseMs: Number(row?.max_response_ms ?? 0),
    incidentCount: Number(row?.incident_count ?? 0),
  };
}
