import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { monitors, problemReports } from "../../db/schema.js";
import { getMonitorStatus } from "../../db/queries/monitors.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";

export async function getPublicMonitorInfo(token: string) {
  const [monitor] = await db
    .select({
      id: monitors.id,
      name: monitors.name,
      ownerId: monitors.ownerId,
    })
    .from(monitors)
    .where(eq(monitors.reportToken, token));

  if (!monitor) {
    throw new NotFoundError("Problem report link not found or disabled");
  }

  const status = await getMonitorStatus(monitor.ownerId, monitor.id);

  return {
    monitorName: monitor.name,
    status: status?.currentStatus || "unknown",
  };
}

export async function submitPublicReport(
  token: string,
  data: {
    category: "down" | "slow" | "error" | "other";
    description: string;
    contactEmail?: string;
    website?: string;
  }
) {
  // Honeypot check: automated spambots filling the hidden "website" field are rejected
  if (data.website && data.website.trim().length > 0) {
    throw new ValidationError("Spam submission detected");
  }

  const [monitor] = await db
    .select({
      id: monitors.id,
    })
    .from(monitors)
    .where(eq(monitors.reportToken, token));

  if (!monitor) {
    throw new NotFoundError("Problem report link not found or disabled");
  }

  const [created] = await db
    .insert(problemReports)
    .values({
      monitorId: monitor.id,
      category: data.category,
      description: data.description.trim(),
      reporterEmail: data.contactEmail?.trim() || null,
      status: "new",
    })
    .returning({ id: problemReports.id });

  return { id: created.id };
}
