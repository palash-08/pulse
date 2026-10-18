import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { monitors } from "../../db/schema.js";
import { env } from "../../config/env.js";
import { validateUrlForSsrf } from "../../health/ssrfGuard.js";
import { getMonitorStatus, listMonitors as listMonitorsQuery } from "../../db/queries/monitors.js";
import { getOpenIncident } from "../../db/queries/incidents.js";
import { NotFoundError } from "../../lib/errors.js";
import { VMonitorStatus } from "../../db/views.js";

function isSimulatedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostPort = `${parsed.hostname.toLowerCase()}:${parsed.port || (parsed.protocol === "https:" ? "443" : "80")}`;
    const allowlist = env.SSRF_ALLOWLIST.split(",").map((s) => s.trim().toLowerCase());
    return allowlist.includes(hostPort) || allowlist.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function formatMonitor(status: VMonitorStatus, reportToken?: string | null, createdAt?: Date | string) {
  return {
    id: status.monitorId,
    name: status.name,
    url: status.url,
    checkIntervalSeconds: status.checkIntervalSeconds,
    status: status.currentStatus,
    lastCheckedAt: status.lastCheckedAt ? status.lastCheckedAt.toISOString() : null,
    lastStatusCode: status.lastStatusCode,
    lastResponseTimeMs: status.lastResponseTimeMs,
    lastError: status.lastErrorSummary,
    hasOpenIncident: status.hasOpenIncident,
    openIncidentStartedAt: status.openIncidentStartedAt ? status.openIncidentStartedAt.toISOString() : null,
    isSimulatedTarget: isSimulatedUrl(status.url),
    reportsEnabled: reportToken !== undefined ? reportToken !== null : false,
    reportToken: reportToken ?? null,
    recentReports15m: status.recentReports15m,
    createdAt: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
  };
}

export async function create(
  ownerId: number,
  data: { name: string; url: string; checkIntervalSeconds?: number }
) {
  // SSRF guard check
  await validateUrlForSsrf(data.url);

  // Insert monitor (trigger trg_monitors_guest_limit will check guest limit)
  const [created] = await db
    .insert(monitors)
    .values({
      ownerId,
      name: data.name.trim(),
      url: data.url.trim(),
      checkIntervalSeconds: data.checkIntervalSeconds ?? 60,
    })
    .returning();

  const status = await getMonitorStatus(ownerId, created.id);
  if (!status) {
    throw new NotFoundError("Failed to retrieve created monitor");
  }

  return formatMonitor(status, created.reportToken, created.createdAt);
}

export async function list(
  ownerId: number,
  filters: { search?: string; status?: "up" | "down" | "unknown"; page?: number; pageSize?: number }
) {
  const { items, total } = await listMonitorsQuery(ownerId, filters);

  // Fetch reportTokens for these monitors
  const monitorIds = items.map((i) => i.monitorId);
  const rows = monitorIds.length > 0
    ? await db
        .select({ id: monitors.id, reportToken: monitors.reportToken, createdAt: monitors.createdAt })
        .from(monitors)
        .where(eq(monitors.ownerId, ownerId))
    : [];

  const tokenMap = new Map(rows.map((r) => [r.id, { token: r.reportToken, createdAt: r.createdAt }]));

  return {
    items: items.map((item) => {
      const meta = tokenMap.get(item.monitorId);
      return formatMonitor(item, meta?.token, meta?.createdAt);
    }),
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    total,
  };
}

export async function getById(ownerId: number, monitorId: number) {
  const [monitorRecord] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, monitorId), eq(monitors.ownerId, ownerId)));

  if (!monitorRecord) {
    throw new NotFoundError("Monitor not found");
  }

  const status = await getMonitorStatus(ownerId, monitorId);
  if (!status) {
    throw new NotFoundError("Monitor not found");
  }

  const openIncident = await getOpenIncident(monitorId);

  return {
    monitor: formatMonitor(status, monitorRecord.reportToken, monitorRecord.createdAt),
    openIncident,
  };
}

export async function update(
  ownerId: number,
  monitorId: number,
  data: { name?: string; url?: string; checkIntervalSeconds?: number }
) {
  if (data.url) {
    await validateUrlForSsrf(data.url);
  }

  const updatePayload: Partial<typeof monitors.$inferInsert> = {};
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.url !== undefined) updatePayload.url = data.url.trim();
  if (data.checkIntervalSeconds !== undefined) {
    updatePayload.checkIntervalSeconds = data.checkIntervalSeconds;
  }

  const [updated] = await db
    .update(monitors)
    .set(updatePayload)
    .where(and(eq(monitors.id, monitorId), eq(monitors.ownerId, ownerId)))
    .returning();

  if (!updated) {
    throw new NotFoundError("Monitor not found");
  }

  const status = await getMonitorStatus(ownerId, monitorId);
  return formatMonitor(status!, updated.reportToken, updated.createdAt);
}

export async function remove(ownerId: number, monitorId: number) {
  const [deleted] = await db
    .delete(monitors)
    .where(and(eq(monitors.id, monitorId), eq(monitors.ownerId, ownerId)))
    .returning();

  if (!deleted) {
    throw new NotFoundError("Monitor not found");
  }
}

export async function enableReportLink(ownerId: number, monitorId: number) {
  const token = crypto.randomBytes(16).toString("hex"); // 32 characters

  const [updated] = await db
    .update(monitors)
    .set({ reportToken: token })
    .where(and(eq(monitors.id, monitorId), eq(monitors.ownerId, ownerId)))
    .returning();

  if (!updated) {
    throw new NotFoundError("Monitor not found");
  }

  const reportUrl = `${env.PUBLIC_BASE_URL}/report/${token}`;
  return { reportUrl, token };
}

export async function disableReportLink(ownerId: number, monitorId: number) {
  const [updated] = await db
    .update(monitors)
    .set({ reportToken: null })
    .where(and(eq(monitors.id, monitorId), eq(monitors.ownerId, ownerId)))
    .returning();

  if (!updated) {
    throw new NotFoundError("Monitor not found");
  }
}
