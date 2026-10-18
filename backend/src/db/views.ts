import { pgView, integer, bigint, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

// Views are mapped for type safety. .existing() stops drizzle-kit from managing them.
export const vMonitorStatus = pgView("v_monitor_status", {
  monitorId: integer("monitor_id").notNull(),
  ownerId: integer("owner_id").notNull(),
  name: varchar("name").notNull(),
  url: varchar("url").notNull(),
  checkIntervalSeconds: integer("check_interval_seconds").notNull(),
  lastCheckId: bigint("last_check_id", { mode: "number" }),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastStatusCode: integer("last_status_code"),
  lastResponseTimeMs: integer("last_response_time_ms"),
  lastErrorSummary: varchar("last_error_summary"),
  currentStatus: text("current_status").notNull(), // 'up' | 'down' | 'unknown'
  hasOpenIncident: boolean("has_open_incident").notNull(),
  openIncidentStartedAt: timestamp("open_incident_started_at", { withTimezone: true }),
  recentReports15m: integer("recent_reports_15m").notNull(),
}).existing();

export const vIncidentDetails = pgView("v_incident_details", {
  incidentId: integer("incident_id").notNull(),
  monitorId: integer("monitor_id").notNull(),
  ownerId: integer("owner_id").notNull(),
  monitorName: varchar("monitor_name").notNull(),
  monitorUrl: varchar("monitor_url").notNull(),
  status: varchar("status", { length: 10 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
  failedChecks: bigint("failed_checks", { mode: "number" }),
  firstError: varchar("first_error"),
}).existing();

export type VMonitorStatus = typeof vMonitorStatus.$inferSelect;
export type VIncidentDetails = typeof vIncidentDetails.$inferSelect;
