import { relations } from "drizzle-orm";
import { users, monitors, healthChecks, incidents, problemReports } from "./schema.js";

export const usersRelations = relations(users, ({ many }) => ({
  monitors: many(monitors),
}));

export const monitorsRelations = relations(monitors, ({ one, many }) => ({
  owner: one(users, {
    fields: [monitors.ownerId],
    references: [users.id],
  }),
  healthChecks: many(healthChecks),
  incidents: many(incidents),
  problemReports: many(problemReports),
}));

export const healthChecksRelations = relations(healthChecks, ({ one }) => ({
  monitor: one(monitors, {
    fields: [healthChecks.monitorId],
    references: [monitors.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  monitor: one(monitors, {
    fields: [incidents.monitorId],
    references: [monitors.id],
  }),
}));

export const problemReportsRelations = relations(problemReports, ({ one }) => ({
  monitor: one(monitors, {
    fields: [problemReports.monitorId],
    references: [monitors.id],
  }),
}));
