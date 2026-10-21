import { eq, and, sql, gte } from "drizzle-orm";
import { db } from "../../db/client.js";
import { alertContacts, alertLogs, monitors, incidents, AlertContact } from "../../db/schema.js";
import { logger } from "../../lib/logger.js";
import {
  sendDiscordWebhook,
  buildDownEmbed,
  buildRecoveryEmbed,
  buildSslExpiryEmbed,
  buildTestEmbed,
  DiscordEmbed,
} from "./discord.js";

export interface OutageAlertParams {
  monitorId: number;
  ownerId: number;
  incidentId?: number;
  statusCode?: number | null;
  errorSummary?: string | null;
  startedAt?: Date;
}

export interface RecoveryAlertParams {
  monitorId: number;
  ownerId: number;
  incidentId?: number;
  durationSeconds?: number | null;
  responseTimeMs?: number | null;
  resolvedAt?: Date;
}

export interface SslExpiryAlertParams {
  monitorId: number;
  ownerId: number;
  daysRemaining: number | null;
  validTo?: Date | null;
  issuer?: string | null;
  isExpired?: boolean;
}

/**
 * Checks if an alert was recently dispatched for (contact, monitor, eventType)
 * within the contact's cooldown window.
 */
async function isWithinCooldown(
  contactId: number,
  monitorId: number,
  eventType: "down" | "recovery" | "ssl_expiry",
  cooldownMinutes: number
): Promise<boolean> {
  const cutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000);

  const [recent] = await db
    .select({ id: alertLogs.id })
    .from(alertLogs)
    .where(
      and(
        eq(alertLogs.contactId, contactId),
        eq(alertLogs.monitorId, monitorId),
        eq(alertLogs.eventType, eventType),
        gte(alertLogs.sentAt, cutoff),
        eq(alertLogs.deliveryStatus, "success")
      )
    )
    .limit(1);

  return !!recent;
}

/**
 * Dispatches an outage notification to all active Discord contacts for the monitor's owner.
 */
export async function dispatchOutageAlert(params: OutageAlertParams): Promise<void> {
  try {
    const [monitor] = await db
      .select()
      .from(monitors)
      .where(eq(monitors.id, params.monitorId));
    if (!monitor) return;

    const contacts = await db
      .select()
      .from(alertContacts)
      .where(and(eq(alertContacts.userId, params.ownerId), eq(alertContacts.isActive, true)));

    if (contacts.length === 0) return;

    const embed = buildDownEmbed({
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      incidentId: params.incidentId,
      statusCode: params.statusCode,
      errorSummary: params.errorSummary,
      startedAt: params.startedAt,
    });

    const seenWebhooks = new Set<string>();
    for (const contact of contacts) {
      if (!contact.notifyOnDown) continue;
      if (seenWebhooks.has(contact.webhookUrl)) {
        continue; // Deduplicate to avoid sending duplicate alerts to the same webhook
      }
      seenWebhooks.add(contact.webhookUrl);

      const cooldown = await isWithinCooldown(
        contact.id,
        params.monitorId,
        "down",
        contact.cooldownMinutes
      );

      if (cooldown) {
        logger.info(
          `⏱️ Cooldown active for contact ${contact.id} on monitor ${params.monitorId} (down). Skipping.`
        );
        continue;
      }

      const res = await sendDiscordWebhook(contact.webhookUrl, { embeds: [embed] });

      await db.insert(alertLogs).values({
        contactId: contact.id,
        monitorId: params.monitorId,
        incidentId: params.incidentId ?? null,
        eventType: "down",
        deliveryStatus: res.success ? "success" : "failed",
        statusCode: res.statusCode || null,
        errorMessage: res.error ?? null,
      });

      if (res.success) {
        logger.info(`📢 Outage alert dispatched to Discord contact #${contact.id} for "${monitor.name}"`);
      } else {
        logger.warn(`❌ Failed to dispatch outage alert to Discord #${contact.id}: ${res.error}`);
      }
    }
  } catch (err) {
    logger.error("Error in dispatchOutageAlert:", err);
  }
}

/**
 * Dispatches a recovery notification to all active Discord contacts for the monitor's owner.
 */
export async function dispatchRecoveryAlert(params: RecoveryAlertParams): Promise<void> {
  try {
    const [monitor] = await db
      .select()
      .from(monitors)
      .where(eq(monitors.id, params.monitorId));
    if (!monitor) return;

    const contacts = await db
      .select()
      .from(alertContacts)
      .where(and(eq(alertContacts.userId, params.ownerId), eq(alertContacts.isActive, true)));

    if (contacts.length === 0) return;

    const embed = buildRecoveryEmbed({
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      durationSeconds: params.durationSeconds,
      responseTimeMs: params.responseTimeMs,
      resolvedAt: params.resolvedAt,
    });

    const seenWebhooks = new Set<string>();
    for (const contact of contacts) {
      if (!contact.notifyOnRecovery) continue;
      if (seenWebhooks.has(contact.webhookUrl)) {
        continue; // Deduplicate to avoid sending duplicate alerts to the same webhook
      }
      seenWebhooks.add(contact.webhookUrl);

      const cooldown = await isWithinCooldown(
        contact.id,
        params.monitorId,
        "recovery",
        contact.cooldownMinutes
      );

      if (cooldown) {
        logger.info(
          `⏱️ Cooldown active for contact ${contact.id} on monitor ${params.monitorId} (recovery). Skipping.`
        );
        continue;
      }

      const res = await sendDiscordWebhook(contact.webhookUrl, { embeds: [embed] });

      await db.insert(alertLogs).values({
        contactId: contact.id,
        monitorId: params.monitorId,
        incidentId: params.incidentId ?? null,
        eventType: "recovery",
        deliveryStatus: res.success ? "success" : "failed",
        statusCode: res.statusCode || null,
        errorMessage: res.error ?? null,
      });

      if (res.success) {
        logger.info(`📢 Recovery alert dispatched to Discord contact #${contact.id} for "${monitor.name}"`);
      } else {
        logger.warn(`❌ Failed to dispatch recovery alert to Discord #${contact.id}: ${res.error}`);
      }
    }
  } catch (err) {
    logger.error("Error in dispatchRecoveryAlert:", err);
  }
}

/**
 * Dispatches an SSL certificate expiry warning to all active Discord contacts.
 */
export async function dispatchSslExpiryAlert(params: SslExpiryAlertParams): Promise<void> {
  try {
    const [monitor] = await db
      .select()
      .from(monitors)
      .where(eq(monitors.id, params.monitorId));
    if (!monitor) return;

    const contacts = await db
      .select()
      .from(alertContacts)
      .where(and(eq(alertContacts.userId, params.ownerId), eq(alertContacts.isActive, true)));

    if (contacts.length === 0) return;

    const embed = buildSslExpiryEmbed({
      monitorName: monitor.name,
      monitorUrl: monitor.url,
      daysRemaining: params.daysRemaining,
      validTo: params.validTo,
      issuer: params.issuer,
      isExpired: params.isExpired,
    });

    const seenWebhooks = new Set<string>();
    for (const contact of contacts) {
      if (!contact.notifyOnSslExpiry) continue;
      if (seenWebhooks.has(contact.webhookUrl)) {
        continue; // Deduplicate to avoid sending duplicate alerts to the same webhook
      }
      seenWebhooks.add(contact.webhookUrl);

      // For SSL expiry, cooldown is enforced so we don't alert more than once every 24 hours (1440 min)
      const cooldown = await isWithinCooldown(
        contact.id,
        params.monitorId,
        "ssl_expiry",
        Math.max(contact.cooldownMinutes, 1440)
      );

      if (cooldown) {
        continue;
      }

      const res = await sendDiscordWebhook(contact.webhookUrl, { embeds: [embed] });

      await db.insert(alertLogs).values({
        contactId: contact.id,
        monitorId: params.monitorId,
        eventType: "ssl_expiry",
        deliveryStatus: res.success ? "success" : "failed",
        statusCode: res.statusCode || null,
        errorMessage: res.error ?? null,
      });
    }
  } catch (err) {
    logger.error("Error in dispatchSslExpiryAlert:", err);
  }
}

/**
 * Dispatches an immediate test notification to a specific alert contact.
 */
export async function dispatchTestAlert(
  contact: AlertContact,
  userName?: string
): Promise<{ success: boolean; statusCode: number; error?: string }> {
  const embed = buildTestEmbed(userName);
  const res = await sendDiscordWebhook(contact.webhookUrl, { embeds: [embed] });

  // Get first available monitor for logging (or fallback monitor)
  const [firstMonitor] = await db
    .select({ id: monitors.id })
    .from(monitors)
    .where(eq(monitors.ownerId, contact.userId))
    .limit(1);

  if (firstMonitor) {
    await db.insert(alertLogs).values({
      contactId: contact.id,
      monitorId: firstMonitor.id,
      eventType: "test",
      deliveryStatus: res.success ? "success" : "failed",
      statusCode: res.statusCode || null,
      errorMessage: res.error ?? null,
    });
  }

  return res;
}
