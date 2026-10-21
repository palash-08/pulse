import { eq, desc } from "drizzle-orm";
import { db } from "../db/client.js";
import { monitors, sslChecks, SslCheck } from "../db/schema.js";
import { inspectSslCertificate, SslCheckResult } from "./sslChecker.js";
import { dispatchSslExpiryAlert } from "../modules/alerts/dispatcher.js";
import { logger } from "../lib/logger.js";
import { NotFoundError } from "../lib/errors.js";

export async function executeSslCheck(
  monitorId: number,
  expectedOwnerId?: number
): Promise<{ check: SslCheck | null; isApplicable: boolean }> {
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, monitorId));

  if (!monitor) {
    throw new NotFoundError("Monitor not found");
  }

  if (expectedOwnerId !== undefined && monitor.ownerId !== expectedOwnerId) {
    throw new NotFoundError("Monitor not found");
  }

  if (!monitor.url.toLowerCase().startsWith("https://")) {
    return { check: null, isApplicable: false };
  }

  const inspection: SslCheckResult = await inspectSslCertificate(monitor.url);

  const [inserted] = await db
    .insert(sslChecks)
    .values({
      monitorId: monitor.id,
      isValid: inspection.isValid,
      issuer: inspection.issuer,
      subject: inspection.subject,
      validFrom: inspection.validFrom,
      validTo: inspection.validTo,
      daysRemaining: inspection.daysRemaining,
      protocol: inspection.protocol,
      errorMessage: inspection.errorMessage,
    })
    .returning();

  // If certificate is expiring in <= 30 days or is invalid/expired, dispatch notification
  if (
    (inspection.daysRemaining !== null && inspection.daysRemaining <= 30) ||
    !inspection.isValid
  ) {
    logger.warn(
      `⚠️ SSL warning for monitor ${monitor.name}: ${inspection.errorMessage || `${inspection.daysRemaining} days left`}`
    );
    dispatchSslExpiryAlert({
      monitorId: monitor.id,
      ownerId: monitor.ownerId,
      daysRemaining: inspection.daysRemaining,
      validTo: inspection.validTo,
      issuer: inspection.issuer,
      isExpired: !inspection.isValid,
    }).catch((err) => logger.error("Error dispatching SSL alert:", err));
  }

  return { check: inserted, isApplicable: true };
}

export async function getMonitorSslStatus(
  monitorId: number,
  ownerId?: number
): Promise<{
  isHttps: boolean;
  latest: SslCheck | null;
  history: SslCheck[];
}> {
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(eq(monitors.id, monitorId));

  if (!monitor) {
    throw new NotFoundError("Monitor not found");
  }

  if (ownerId !== undefined && monitor.ownerId !== ownerId) {
    throw new NotFoundError("Monitor not found");
  }

  const isHttps = monitor.url.toLowerCase().startsWith("https://");

  const history = await db
    .select()
    .from(sslChecks)
    .where(eq(sslChecks.monitorId, monitorId))
    .orderBy(desc(sslChecks.checkedAt))
    .limit(20);

  const latest = history[0] || null;

  return { isHttps, latest, history };
}
