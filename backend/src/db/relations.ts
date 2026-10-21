import { relations } from "drizzle-orm";
import {
  users,
  monitors,
  healthChecks,
  incidents,
  problemReports,
  sslChecks,
  alertContacts,
  alertLogs,
} from "./schema.js";

export const usersRelations = relations(users, ({ many }) => ({
  monitors: many(monitors),
  alertContacts: many(alertContacts),
}));

export const monitorsRelations = relations(monitors, ({ one, many }) => ({
  owner: one(users, {
    fields: [monitors.ownerId],
    references: [users.id],
  }),
  healthChecks: many(healthChecks),
  incidents: many(incidents),
  problemReports: many(problemReports),
  sslChecks: many(sslChecks),
  alertLogs: many(alertLogs),
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

export const sslChecksRelations = relations(sslChecks, ({ one }) => ({
  monitor: one(monitors, {
    fields: [sslChecks.monitorId],
    references: [monitors.id],
  }),
}));

export const alertContactsRelations = relations(alertContacts, ({ one, many }) => ({
  user: one(users, {
    fields: [alertContacts.userId],
    references: [users.id],
  }),
  alertLogs: many(alertLogs),
}));

export const alertLogsRelations = relations(alertLogs, ({ one }) => ({
  contact: one(alertContacts, {
    fields: [alertLogs.contactId],
    references: [alertContacts.id],
  }),
  monitor: one(monitors, {
    fields: [alertLogs.monitorId],
    references: [monitors.id],
  }),
  incident: one(incidents, {
    fields: [alertLogs.incidentId],
    references: [incidents.id],
  }),
}));
