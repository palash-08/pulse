import { sql } from "drizzle-orm";
import {
  pgTable,
  integer,
  bigint,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  index,
  unique,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    email: varchar("email", { length: 255 }).unique(),
    displayName: varchar("display_name", { length: 80 }),
    passwordHash: text("password_hash"),
    isGuest: boolean("is_guest").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "users_guest_shape_chk",
      sql`(${t.isGuest} AND ${t.email} IS NULL AND ${t.passwordHash} IS NULL)
       OR (NOT ${t.isGuest} AND ${t.email} IS NOT NULL AND ${t.passwordHash} IS NOT NULL AND ${t.displayName} IS NOT NULL)`
    ),
    check("users_email_lower_chk", sql`${t.email} = lower(${t.email})`),
  ]
);

export const monitors = pgTable(
  "monitors",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    url: varchar("url", { length: 2048 }).notNull(),
    checkIntervalSeconds: integer("check_interval_seconds").notNull().default(60),
    reportToken: varchar("report_token", { length: 64 }).unique(), // NULL = problem reports off
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("monitors_owner_url_uq").on(t.ownerId, t.url),
    check("monitors_interval_chk", sql`${t.checkIntervalSeconds} BETWEEN 30 AND 3600`),
    check("monitors_url_chk", sql`${t.url} ~* '^https?://'`),
    check("monitors_name_chk", sql`length(btrim(${t.name})) > 0`),
  ]
);

export const healthChecks = pgTable(
  "health_checks",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    isSuccessful: boolean("is_successful").notNull(),
    statusCode: integer("status_code"),
    responseTimeMs: integer("response_time_ms"),
    errorSummary: varchar("error_summary", { length: 500 }),
    triggerSource: varchar("trigger_source", { length: 10 }).notNull().default("scheduled"),
    probeId: varchar("probe_id", { length: 100 }),
    region: varchar("region", { length: 100 }),
  },
  (t) => [
    index("health_checks_monitor_time_idx").on(t.monitorId, t.checkedAt.desc()),
    index("health_checks_probe_time_idx").on(t.monitorId, t.probeId, t.checkedAt.desc()),
    check("hc_status_code_chk", sql`${t.statusCode} IS NULL OR ${t.statusCode} BETWEEN 100 AND 599`),
    check("hc_response_time_chk", sql`${t.responseTimeMs} IS NULL OR ${t.responseTimeMs} >= 0`),
    check(
      "hc_outcome_chk",
      sql`(${t.isSuccessful} AND ${t.errorSummary} IS NULL)
       OR (NOT ${t.isSuccessful} AND ${t.errorSummary} IS NOT NULL)`
    ),
    check("hc_trigger_chk", sql`${t.triggerSource} IN ('scheduled','manual','probe')`),
  ]
);

export const incidents = pgTable(
  "incidents",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 10 }).notNull().default("open"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("incidents_one_open_per_monitor_uq")
      .on(t.monitorId)
      .where(sql`${t.status} = 'open'`),
    index("incidents_monitor_started_idx").on(t.monitorId, t.startedAt.desc()),
    check("incidents_status_chk", sql`${t.status} IN ('open','resolved')`),
    check(
      "incidents_lifecycle_chk",
      sql`(${t.status} = 'open' AND ${t.resolvedAt} IS NULL)
       OR (${t.status} = 'resolved' AND ${t.resolvedAt} IS NOT NULL AND ${t.resolvedAt} >= ${t.startedAt})`
    ),
  ]
);

export const problemReports = pgTable(
  "problem_reports",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 10 }).notNull(),
    description: varchar("description", { length: 1000 }).notNull(),
    reporterEmail: varchar("reporter_email", { length: 255 }),
    status: varchar("status", { length: 15 }).notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("problem_reports_monitor_time_idx").on(t.monitorId, t.createdAt.desc()),
    check("pr_category_chk", sql`${t.category} IN ('down','slow','error','other')`),
    check("pr_status_chk", sql`${t.status} IN ('new','acknowledged','resolved','dismissed')`),
    check("pr_description_chk", sql`length(${t.description}) >= 10`),
  ]
);

// Session store table used by connect-pg-simple (createTableIfMissing: false)
export const userSessions = pgTable(
  "user_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (t) => [index("user_sessions_expire_idx").on(t.expire)]
);

export const sslChecks = pgTable(
  "ssl_checks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    isValid: boolean("is_valid").notNull(),
    issuer: varchar("issuer", { length: 255 }),
    subject: varchar("subject", { length: 255 }),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    daysRemaining: integer("days_remaining"),
    protocol: varchar("protocol", { length: 50 }),
    errorMessage: varchar("error_message", { length: 500 }),
  },
  (t) => [
    index("ssl_checks_monitor_time_idx").on(t.monitorId, t.checkedAt.desc()),
    check("ssl_days_chk", sql`${t.daysRemaining} IS NULL OR ${t.daysRemaining} BETWEEN -36500 AND 36500`),
  ]
);

export const alertContacts = pgTable(
  "alert_contacts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull().default("discord"),
    name: varchar("name", { length: 100 }).notNull(),
    webhookUrl: varchar("webhook_url", { length: 2048 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    cooldownMinutes: integer("cooldown_minutes").notNull().default(15),
    notifyOnDown: boolean("notify_on_down").notNull().default(true),
    notifyOnRecovery: boolean("notify_on_recovery").notNull().default(true),
    notifyOnSslExpiry: boolean("notify_on_ssl_expiry").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("alert_contacts_user_idx").on(t.userId),
    check("alert_contacts_type_chk", sql`${t.type} IN ('discord')`),
    check("alert_contacts_cooldown_chk", sql`${t.cooldownMinutes} BETWEEN 1 AND 1440`),
    check("alert_contacts_url_chk", sql`${t.webhookUrl} ~* '^https://(discord\\.com|discordapp\\.com)/api/webhooks/'`),
  ]
);

export const alertLogs = pgTable(
  "alert_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    contactId: integer("contact_id").references(() => alertContacts.id, { onDelete: "set null" }),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    incidentId: integer("incident_id").references(() => incidents.id, { onDelete: "set null" }),
    eventType: varchar("event_type", { length: 20 }).notNull(),
    deliveryStatus: varchar("delivery_status", { length: 10 }).notNull(),
    statusCode: integer("status_code"),
    errorMessage: varchar("error_message", { length: 500 }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("alert_logs_monitor_sent_idx").on(t.monitorId, t.sentAt.desc()),
    index("alert_logs_contact_sent_idx").on(t.contactId, t.sentAt.desc()),
    index("alert_logs_event_cooldown_idx").on(t.contactId, t.monitorId, t.eventType, t.sentAt.desc()),
    check("alert_logs_event_chk", sql`${t.eventType} IN ('down','recovery','ssl_expiry','test')`),
    check("alert_logs_status_chk", sql`${t.deliveryStatus} IN ('success','failed')`),
  ]
);

export const probeNodes = pgTable("probe_nodes", {
  id: varchar("id", { length: 100 }).primaryKey(),
  region: varchar("region", { length: 100 }).notNull(),
  name: varchar("name", { length: 100 }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Monitor = typeof monitors.$inferSelect;
export type NewMonitor = typeof monitors.$inferInsert;
export type HealthCheck = typeof healthChecks.$inferSelect;
export type NewHealthCheck = typeof healthChecks.$inferInsert;
export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
export type ProblemReport = typeof problemReports.$inferSelect;
export type NewProblemReport = typeof problemReports.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type SslCheck = typeof sslChecks.$inferSelect;
export type NewSslCheck = typeof sslChecks.$inferInsert;
export type AlertContact = typeof alertContacts.$inferSelect;
export type NewAlertContact = typeof alertContacts.$inferInsert;
export type AlertLog = typeof alertLogs.$inferSelect;
export type NewAlertLog = typeof alertLogs.$inferInsert;
export type ProbeNode = typeof probeNodes.$inferSelect;
export type NewProbeNode = typeof probeNodes.$inferInsert;
