CREATE TABLE IF NOT EXISTS "users" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "email" varchar(255) UNIQUE,
  "display_name" varchar(80),
  "password_hash" text,
  "is_guest" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_login_at" timestamp with time zone,
  CONSTRAINT "users_guest_shape_chk" CHECK (
    ("is_guest" AND "email" IS NULL AND "password_hash" IS NULL)
    OR (NOT "is_guest" AND "email" IS NOT NULL AND "password_hash" IS NOT NULL AND "display_name" IS NOT NULL)
  ),
  CONSTRAINT "users_email_lower_chk" CHECK ("email" = lower("email"))
);

CREATE TABLE IF NOT EXISTS "monitors" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "owner_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "url" varchar(2048) NOT NULL,
  "check_interval_seconds" integer DEFAULT 60 NOT NULL,
  "report_token" varchar(64) UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "monitors_owner_url_uq" UNIQUE("owner_id", "url"),
  CONSTRAINT "monitors_interval_chk" CHECK ("check_interval_seconds" BETWEEN 30 AND 3600),
  CONSTRAINT "monitors_url_chk" CHECK ("url" ~* '^https?://'),
  CONSTRAINT "monitors_name_chk" CHECK (length(btrim("name")) > 0)
);

CREATE TABLE IF NOT EXISTS "health_checks" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "monitor_id" integer NOT NULL REFERENCES "monitors"("id") ON DELETE CASCADE,
  "checked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "is_successful" boolean NOT NULL,
  "status_code" integer,
  "response_time_ms" integer,
  "error_summary" varchar(500),
  "trigger_source" varchar(10) DEFAULT 'scheduled' NOT NULL,
  CONSTRAINT "hc_status_code_chk" CHECK ("status_code" IS NULL OR "status_code" BETWEEN 100 AND 599),
  CONSTRAINT "hc_response_time_chk" CHECK ("response_time_ms" IS NULL OR "response_time_ms" >= 0),
  CONSTRAINT "hc_outcome_chk" CHECK (
    ("is_successful" AND "error_summary" IS NULL)
    OR (NOT "is_successful" AND "error_summary" IS NOT NULL)
  ),
  CONSTRAINT "hc_trigger_chk" CHECK ("trigger_source" IN ('scheduled', 'manual'))
);
CREATE INDEX IF NOT EXISTS "health_checks_monitor_time_idx" ON "health_checks" ("monitor_id", "checked_at" DESC);

CREATE TABLE IF NOT EXISTS "incidents" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "monitor_id" integer NOT NULL REFERENCES "monitors"("id") ON DELETE CASCADE,
  "status" varchar(10) DEFAULT 'open' NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  CONSTRAINT "incidents_status_chk" CHECK ("status" IN ('open', 'resolved')),
  CONSTRAINT "incidents_lifecycle_chk" CHECK (
    ("status" = 'open' AND "resolved_at" IS NULL)
    OR ("status" = 'resolved' AND "resolved_at" IS NOT NULL AND "resolved_at" >= "started_at")
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS "incidents_one_open_per_monitor_uq" ON "incidents" ("monitor_id") WHERE "status" = 'open';
CREATE INDEX IF NOT EXISTS "incidents_monitor_started_idx" ON "incidents" ("monitor_id", "started_at" DESC);

CREATE TABLE IF NOT EXISTS "problem_reports" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "monitor_id" integer NOT NULL REFERENCES "monitors"("id") ON DELETE CASCADE,
  "category" varchar(10) NOT NULL,
  "description" varchar(1000) NOT NULL,
  "reporter_email" varchar(255),
  "status" varchar(15) DEFAULT 'new' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pr_category_chk" CHECK ("category" IN ('down', 'slow', 'error', 'other')),
  CONSTRAINT "pr_status_chk" CHECK ("status" IN ('new', 'acknowledged', 'resolved', 'dismissed')),
  CONSTRAINT "pr_description_chk" CHECK (length("description") >= 10)
);
CREATE INDEX IF NOT EXISTS "problem_reports_monitor_time_idx" ON "problem_reports" ("monitor_id", "created_at" DESC);

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid" varchar PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS "user_sessions_expire_idx" ON "user_sessions" ("expire");
