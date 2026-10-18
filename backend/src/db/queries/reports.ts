import { sql } from "drizzle-orm";
import { db } from "../client.js";

export interface ProblemReportItem {
  id: number;
  monitorId: number;
  monitorName: string;
  category: "down" | "slow" | "error" | "other";
  description: string;
  reporterEmail: string | null;
  status: "new" | "acknowledged" | "resolved" | "dismissed";
  createdAt: string;
}

/**
 * List problem reports for an owner's monitors.
 */
export async function listProblemReports(
  ownerId: number,
  options: {
    status?: string;
    monitorId?: number;
    page?: number;
    pageSize?: number;
  }
): Promise<{ items: ProblemReportItem[]; total: number }> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const status = options.status ?? null;
  const monitorId = options.monitorId ?? null;

  const itemsResult = await db.execute<any>(sql`
    SELECT
      pr.id,
      pr.monitor_id AS "monitorId",
      m.name AS "monitorName",
      pr.category,
      pr.description,
      pr.reporter_email AS "reporterEmail",
      pr.status,
      pr.created_at AS "createdAt"
    FROM problem_reports pr
    JOIN monitors m ON m.id = pr.monitor_id
    WHERE m.owner_id = ${ownerId}
      AND (${status}::varchar IS NULL OR pr.status = ${status})
      AND (${monitorId}::integer IS NULL OR pr.monitor_id = ${monitorId})
    ORDER BY pr.created_at DESC
    LIMIT ${pageSize} OFFSET ${offset};
  `);

  const countResult = await db.execute<{ total: string }>(sql`
    SELECT COUNT(*)::integer AS total
    FROM problem_reports pr
    JOIN monitors m ON m.id = pr.monitor_id
    WHERE m.owner_id = ${ownerId}
      AND (${status}::varchar IS NULL OR pr.status = ${status})
      AND (${monitorId}::integer IS NULL OR pr.monitor_id = ${monitorId});
  `);

  return {
    items: itemsResult.rows as ProblemReportItem[],
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

/**
 * Total new problem reports for dashboard badge.
 */
export async function getNewReportsCount(ownerId: number): Promise<number> {
  const result = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::integer AS count
    FROM problem_reports pr
    JOIN monitors m ON m.id = pr.monitor_id
    WHERE m.owner_id = ${ownerId} AND pr.status = 'new';
  `);

  return Number(result.rows[0]?.count ?? 0);
}

/**
 * GROUP BY + HAVING: monitors with >= 3 non-dismissed reports in the last 24 hours.
 */
export async function getReportClusters(ownerId: number): Promise<
  Array<{
    id: number;
    name: string;
    reports: number;
    downReports: number;
  }>
> {
  const result = await db.execute<{
    id: number;
    name: string;
    reports: string;
    down_reports: string;
  }>(sql`
    SELECT
      m.id,
      m.name,
      COUNT(*)::integer AS reports,
      COUNT(*) FILTER (WHERE pr.category = 'down')::integer AS down_reports
    FROM problem_reports pr
    JOIN monitors m ON m.id = pr.monitor_id
    WHERE m.owner_id = ${ownerId}
      AND pr.status <> 'dismissed'
      AND pr.created_at >= now() - interval '24 hours'
    GROUP BY m.id, m.name
    HAVING COUNT(*) >= 3
    ORDER BY reports DESC;
  `);

  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    reports: Number(r.reports),
    downReports: Number(r.down_reports),
  }));
}
