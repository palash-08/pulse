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
  },
  (t) => [
    index("health_checks_monitor_time_idx").on(t.monitorId, t.checkedAt.desc()),
    check("hc_status_code_chk", sql`${t.statusCode} IS NULL OR ${t.statusCode} BETWEEN 100 AND 599`),
    check("hc_response_time_chk", sql`${t.responseTimeMs} IS NULL OR ${t.responseTimeMs} >= 0`),
    check(
      "hc_outcome_chk",
      sql`(${t.isSuccessful} AND ${t.errorSummary} IS NULL)
       OR (NOT ${t.isSuccessful} AND ${t.errorSummary} IS NOT NULL)`
    ),
    check("hc_trigger_chk", sql`${t.triggerSource} IN ('scheduled','manual')`),
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
