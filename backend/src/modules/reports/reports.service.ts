import { eq, and } from "drizzle-orm";
import { db } from "../../db/client.js";
import { problemReports, monitors } from "../../db/schema.js";
import { listProblemReports } from "../../db/queries/reports.js";
import { NotFoundError } from "../../lib/errors.js";

export async function list(ownerId: number, options: any) {
  return await listProblemReports(ownerId, options);
}

export async function updateStatus(
  ownerId: number,
  reportId: number,
  newStatus: "acknowledged" | "resolved" | "dismissed"
) {
  // Verify report belongs to an owner's monitor
  const [existing] = await db
    .select({
      reportId: problemReports.id,
      monitorId: problemReports.monitorId,
      ownerId: monitors.ownerId,
    })
    .from(problemReports)
    .join(monitors, eq(monitors.id, problemReports.monitorId))
    .where(and(eq(problemReports.id, reportId), eq(monitors.ownerId, ownerId)));

  if (!existing) {
    throw new NotFoundError("Problem report not found");
  }

  const [updated] = await db
    .update(problemReports)
    .set({ status: newStatus })
    .where(eq(problemReports.id, reportId))
    .returning();

  return updated;
}
