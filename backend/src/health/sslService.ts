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

  let inspection: SslCheckResult = await inspectSslCertificate(monitor.url);

  // FAILSAFE 1: Distinguish between connection/network failures and genuine certificate issues.
  // If the host is unreachable, connection refused, timed out, or DNS failed, do NOT dispatch
  // an SSL alert. (Network/availability issues are handled by health checks and outage alerts).
  const hasCertificate = inspection.validTo !== null && inspection.daysRemaining !== null;
  const isCandidateForAlert =
    !inspection.isConnectionError &&
    (
      // Case A: Certificate was retrieved and is expiring in <= 30 days or expired
      (hasCertificate && inspection.daysRemaining <= 30) ||
      // Case B: Certificate was presented by the server but is untrusted / invalid chain
      (!inspection.isValid && (hasCertificate || inspection.issuer !== null))
    );

  // FAILSAFE 2: Confirmation Retry
  // If an SSL certificate issue is detected, perform a confirmation retry after a brief delay
  // to avoid false alarms from transient TLS handshake glitches or server reloads.
  let confirmedIssue = false;
  if (isCandidateForAlert) {
    logger.info(`🔍 Candidate SSL alert for "${monitor.name}". Performing confirmation retry...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const retry = await inspectSslCertificate(monitor.url);

    if (
      !retry.isConnectionError &&
      (
        (retry.daysRemaining !== null && retry.daysRemaining <= 30) ||
        (!retry.isValid && (retry.validTo !== null || retry.issuer !== null))
      )
    ) {
      confirmedIssue = true;
      inspection = retry; // Use latest confirmed inspection data
    } else {
      logger.info(
        `✅ SSL warning for "${monitor.name}" was not confirmed on retry. Suppressed false alarm.`
      );
    }
  }

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

  if (confirmedIssue) {
    logger.warn(
      `⚠️ Confirmed SSL alert for monitor ${monitor.name}: ${inspection.errorMessage || `${inspection.daysRemaining} days left`}`
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
