import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { alertContacts, alertLogs, monitors, AlertContact } from "../../db/schema.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import { dispatchTestAlert } from "./dispatcher.js";

/**
 * Masks a sensitive Discord webhook URL for safe UI display.
 * Example: https://discord.com/api/webhooks/123456789/AbCdEfGhIj -> https://discord.com/api/webhooks/123456789/••••••••
 */
export function maskWebhookUrl(url: string): string {
  try {
    const parts = url.split("/");
    if (parts.length >= 2) {
      const token = parts[parts.length - 1];
      const maskedToken = token.length > 6 ? `${token.slice(0, 3)}••••${token.slice(-3)}` : "••••••••";
      parts[parts.length - 1] = maskedToken;
      return parts.join("/");
    }
  } catch {
    // Fallback
  }
  return "https://discord.com/api/webhooks/••••••••";
}

export async function listContacts(userId: number) {
  const contacts = await db
    .select()
    .from(alertContacts)
    .where(eq(alertContacts.userId, userId))
    .orderBy(desc(alertContacts.createdAt));

  return contacts.map((c) => ({
    ...c,
    maskedWebhookUrl: maskWebhookUrl(c.webhookUrl),
  }));
}

export async function getContactById(userId: number, contactId: number) {
  const [contact] = await db
    .select()
    .from(alertContacts)
    .where(and(eq(alertContacts.id, contactId), eq(alertContacts.userId, userId)));

  if (!contact) {
    throw new NotFoundError("Alert contact not found");
  }

  return {
    ...contact,
    maskedWebhookUrl: maskWebhookUrl(contact.webhookUrl),
  };
}

export async function createContact(
  userId: number,
  data: {
    name: string;
    webhookUrl: string;
    cooldownMinutes?: number;
    notifyOnDown?: boolean;
    notifyOnRecovery?: boolean;
    notifyOnSslExpiry?: boolean;
  }
) {
  const [existing] = await db
    .select({ id: alertContacts.id })
    .from(alertContacts)
    .where(and(eq(alertContacts.userId, userId), eq(alertContacts.webhookUrl, data.webhookUrl)))
    .limit(1);

  if (existing) {
    throw new ValidationError("An alert contact with this Discord webhook URL already exists.");
  }

  const [contact] = await db
    .insert(alertContacts)
    .values({
      userId,
      type: "discord",
      name: data.name,
      webhookUrl: data.webhookUrl,
      cooldownMinutes: data.cooldownMinutes ?? 15,
      notifyOnDown: data.notifyOnDown ?? true,
      notifyOnRecovery: data.notifyOnRecovery ?? true,
      notifyOnSslExpiry: data.notifyOnSslExpiry ?? true,
    })
    .returning();

  return {
    ...contact,
    maskedWebhookUrl: maskWebhookUrl(contact.webhookUrl),
  };
}

export async function updateContact(
  userId: number,
  contactId: number,
  data: Partial<{
    name: string;
    webhookUrl: string;
    isActive: boolean;
    cooldownMinutes: number;
    notifyOnDown: boolean;
    notifyOnRecovery: boolean;
    notifyOnSslExpiry: boolean;
  }>
) {
  const [existing] = await db
    .select()
    .from(alertContacts)
    .where(and(eq(alertContacts.id, contactId), eq(alertContacts.userId, userId)));

  if (!existing) {
    throw new NotFoundError("Alert contact not found");
  }

  if (data.webhookUrl && data.webhookUrl !== existing.webhookUrl) {
    const [duplicate] = await db
      .select({ id: alertContacts.id })
      .from(alertContacts)
      .where(
        and(
          eq(alertContacts.userId, userId),
          eq(alertContacts.webhookUrl, data.webhookUrl),
          sql`${alertContacts.id} != ${contactId}`
        )
      )
      .limit(1);

    if (duplicate) {
      throw new ValidationError("An alert contact with this Discord webhook URL already exists.");
    }
  }

  const [updated] = await db
    .update(alertContacts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(alertContacts.id, contactId))
    .returning();

  return {
    ...updated,
    maskedWebhookUrl: maskWebhookUrl(updated.webhookUrl),
  };
}

export async function deleteContact(userId: number, contactId: number) {
  const [existing] = await db
    .select()
    .from(alertContacts)
    .where(and(eq(alertContacts.id, contactId), eq(alertContacts.userId, userId)));

  if (!existing) {
    throw new NotFoundError("Alert contact not found");
  }

  await db.delete(alertContacts).where(eq(alertContacts.id, contactId));
}

export async function testContact(userId: number, contactId: number, userName?: string) {
  const [contact] = await db
    .select()
    .from(alertContacts)
    .where(and(eq(alertContacts.id, contactId), eq(alertContacts.userId, userId)));

  if (!contact) {
    throw new NotFoundError("Alert contact not found");
  }

  const testResult = await dispatchTestAlert(contact, userName);
  return testResult;
}

export async function listAlertLogs(
  userId: number,
  params: { page?: number; pageSize?: number; monitorId?: number }
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const logs = await db
    .select({
      id: alertLogs.id,
      contactId: alertLogs.contactId,
      contactName: alertContacts.name,
      monitorId: alertLogs.monitorId,
      monitorName: monitors.name,
      incidentId: alertLogs.incidentId,
      eventType: alertLogs.eventType,
      deliveryStatus: alertLogs.deliveryStatus,
      statusCode: alertLogs.statusCode,
      errorMessage: alertLogs.errorMessage,
      sentAt: alertLogs.sentAt,
    })
    .from(alertLogs)
    .innerJoin(monitors, eq(alertLogs.monitorId, monitors.id))
    .leftJoin(alertContacts, eq(alertLogs.contactId, alertContacts.id))
    .where(
      and(
        eq(monitors.ownerId, userId),
        params.monitorId ? eq(alertLogs.monitorId, params.monitorId) : undefined
      )
    )
    .orderBy(desc(alertLogs.sentAt))
    .limit(pageSize)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::integer` })
    .from(alertLogs)
    .innerJoin(monitors, eq(alertLogs.monitorId, monitors.id))
    .where(
      and(
        eq(monitors.ownerId, userId),
        params.monitorId ? eq(alertLogs.monitorId, params.monitorId) : undefined
      )
    );

  const total = countResult?.count ?? 0;

  return {
    items: logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
