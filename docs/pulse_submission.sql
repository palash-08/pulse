-- Pulse Database Submission SQL Dump
-- Generated on 2026-10-21T10:26:03.388Z

-- ==========================================
-- File: 0000_init_tables.sql
-- ==========================================
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


-- ==========================================
-- File: 0001_views.sql
-- ==========================================
-- Current state of every monitor: latest check plus open incident.
CREATE OR REPLACE VIEW v_monitor_status AS
SELECT
  m.id                     AS monitor_id,
  m.owner_id,
  m.name,
  m.url,
  m.check_interval_seconds,
  lc.id                    AS last_check_id,
  lc.checked_at            AS last_checked_at,
  lc.status_code           AS last_status_code,
  lc.response_time_ms      AS last_response_time_ms,
  lc.error_summary         AS last_error_summary,
  CASE WHEN lc.id IS NULL THEN 'unknown'
       WHEN lc.is_successful THEN 'up'
       ELSE 'down' END     AS current_status,
  (oi.id IS NOT NULL)      AS has_open_incident,
  oi.started_at            AS open_incident_started_at,
  (SELECT COUNT(*)::integer FROM problem_reports pr
    WHERE pr.monitor_id = m.id AND pr.status <> 'dismissed'
      AND pr.created_at >= now() - interval '15 minutes')
                           AS recent_reports_15m
FROM monitors m
LEFT JOIN LATERAL (
  SELECT hc.id, hc.checked_at, hc.is_successful, hc.status_code,
         hc.response_time_ms, hc.error_summary
  FROM health_checks hc
  WHERE hc.monitor_id = m.id
  ORDER BY hc.checked_at DESC, hc.id DESC
  LIMIT 1
) lc ON true
LEFT JOIN incidents oi
  ON oi.monitor_id = m.id AND oi.status = 'open';

-- Incidents with duration and what failed during them (time-range join).
CREATE OR REPLACE VIEW v_incident_details AS
SELECT
  i.id          AS incident_id,
  i.monitor_id,
  m.owner_id,
  m.name        AS monitor_name,
  m.url         AS monitor_url,
  i.status,
  i.started_at,
  i.resolved_at,
  EXTRACT(EPOCH FROM (COALESCE(i.resolved_at, now()) - i.started_at))::integer
                AS duration_seconds,
  fc.failed_checks,
  fc.first_error
FROM incidents i
JOIN monitors m ON m.id = i.monitor_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS failed_checks,
         (ARRAY_AGG(hc.error_summary ORDER BY hc.checked_at))[1] AS first_error
  FROM health_checks hc
  WHERE hc.monitor_id = i.monitor_id
    AND NOT hc.is_successful
    AND hc.checked_at >= i.started_at
    AND (i.resolved_at IS NULL OR hc.checked_at < i.resolved_at)
) fc ON true;


-- ==========================================
-- File: 0002_functions_procedures.sql
-- ==========================================
-- Uptime summary for one monitor over a time window (aggregates + FILTER).
-- Ownership is checked by the API before this is called.
CREATE OR REPLACE FUNCTION fn_monitor_uptime_summary(
  p_monitor_id integer, p_from timestamptz, p_to timestamptz)
RETURNS TABLE (
  total_checks bigint, successful_checks bigint, uptime_pct numeric,
  avg_response_ms numeric, min_response_ms integer, max_response_ms integer,
  incident_count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE hc.is_successful),
    ROUND(100.0 * COUNT(*) FILTER (WHERE hc.is_successful) / NULLIF(COUNT(*), 0), 2),
    ROUND(AVG(hc.response_time_ms) FILTER (WHERE hc.is_successful), 0),
    MIN(hc.response_time_ms) FILTER (WHERE hc.is_successful),
    MAX(hc.response_time_ms) FILTER (WHERE hc.is_successful),
    (SELECT COUNT(*) FROM incidents i
      WHERE i.monitor_id = p_monitor_id
        AND i.started_at >= p_from AND i.started_at < p_to)
  FROM health_checks hc
  WHERE hc.monitor_id = p_monitor_id
    AND hc.checked_at >= p_from AND hc.checked_at < p_to;
$$;

-- Single source of truth for the guest limit (read by the trigger and by the API for display).
CREATE OR REPLACE FUNCTION fn_guest_monitor_limit()
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT 2 $$;

-- Data retention. A PROCEDURE (called with CALL, can manage transactions) rather than a function.
CREATE OR REPLACE PROCEDURE sp_purge_old_checks(p_retention_days integer)
LANGUAGE plpgsql AS $$
BEGIN
  IF p_retention_days < 7 THEN
    RAISE EXCEPTION 'Retention must be at least 7 days (got %)', p_retention_days;
  END IF;
  DELETE FROM health_checks
  WHERE checked_at < now() - make_interval(days => p_retention_days);
END;
$$;


-- ==========================================
-- File: 0003_triggers.sql
-- ==========================================
-- (1) Incident lifecycle.
--     The ONLY place incidents are written.
CREATE OR REPLACE FUNCTION fn_apply_health_check_to_incidents()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_successful THEN
    -- Recovery: resolve the open incident, if any.
    UPDATE incidents
       SET status = 'resolved',
           resolved_at = GREATEST(NEW.checked_at, started_at)   -- safe with out-of-order timestamps
     WHERE monitor_id = NEW.monitor_id AND status = 'open';
  ELSE
    -- Failure: open an incident unless one is already open.
    -- The partial unique index makes this race-free.
    INSERT INTO incidents (monitor_id, status, started_at)
    VALUES (NEW.monitor_id, 'open', NEW.checked_at)
    ON CONFLICT (monitor_id) WHERE status = 'open' DO NOTHING;
  END IF;
  RETURN NULL;   -- AFTER trigger: return value ignored
END;
$$;

DROP TRIGGER IF EXISTS trg_health_checks_incident_lifecycle ON health_checks;
CREATE TRIGGER trg_health_checks_incident_lifecycle
AFTER INSERT ON health_checks
FOR EACH ROW EXECUTE FUNCTION fn_apply_health_check_to_incidents();

-- (2) Guests may own at most fn_guest_monitor_limit() monitors.
CREATE OR REPLACE FUNCTION fn_enforce_guest_monitor_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_is_guest boolean;
BEGIN
  -- Lock the owner's row so two simultaneous inserts cannot both slip under the limit.
  SELECT is_guest INTO v_is_guest FROM users WHERE id = NEW.owner_id FOR UPDATE;
  IF v_is_guest
     AND (SELECT COUNT(*) FROM monitors WHERE owner_id = NEW.owner_id)
         >= fn_guest_monitor_limit() THEN
    RAISE EXCEPTION 'Guest accounts can monitor at most % sites', fn_guest_monitor_limit()
      USING ERRCODE = 'GL001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_monitors_guest_limit ON monitors;
CREATE TRIGGER trg_monitors_guest_limit
BEFORE INSERT ON monitors
FOR EACH ROW EXECUTE FUNCTION fn_enforce_guest_monitor_limit();


-- ==========================================
-- File: 0004_ssl_and_discord_alerts.sql
-- ==========================================
-- =============================================================================
-- Migration 0004: SSL Certificate Expiry Tracking & Discord Alert Dispatcher
-- =============================================================================

-- 1. SSL Certificate Checks
CREATE TABLE IF NOT EXISTS "ssl_checks" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "monitor_id" integer NOT NULL REFERENCES "monitors"("id") ON DELETE CASCADE,
  "checked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "is_valid" boolean NOT NULL,
  "issuer" varchar(255),
  "subject" varchar(255),
  "valid_from" timestamp with time zone,
  "valid_to" timestamp with time zone,
  "days_remaining" integer,
  "protocol" varchar(50),
  "error_message" varchar(500),
  CONSTRAINT "ssl_days_chk" CHECK ("days_remaining" IS NULL OR "days_remaining" BETWEEN -36500 AND 36500)
);

CREATE INDEX IF NOT EXISTS "ssl_checks_monitor_time_idx" ON "ssl_checks" ("monitor_id", "checked_at" DESC);

-- 2. Alert Contacts (Discord Webhook destinations)
CREATE TABLE IF NOT EXISTS "alert_contacts" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(20) DEFAULT 'discord' NOT NULL,
  "name" varchar(100) NOT NULL,
  "webhook_url" varchar(2048) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "cooldown_minutes" integer DEFAULT 15 NOT NULL,
  "notify_on_down" boolean DEFAULT true NOT NULL,
  "notify_on_recovery" boolean DEFAULT true NOT NULL,
  "notify_on_ssl_expiry" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "alert_contacts_type_chk" CHECK ("type" IN ('discord')),
  CONSTRAINT "alert_contacts_cooldown_chk" CHECK ("cooldown_minutes" BETWEEN 1 AND 1440),
  CONSTRAINT "alert_contacts_url_chk" CHECK ("webhook_url" ~* '^https://(discord\.com|discordapp\.com)/api/webhooks/')
);

CREATE INDEX IF NOT EXISTS "alert_contacts_user_idx" ON "alert_contacts" ("user_id");

-- 3. Alert Logs (Delivery audit trail & cooldown tracking)
CREATE TABLE IF NOT EXISTS "alert_logs" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "contact_id" integer REFERENCES "alert_contacts"("id") ON DELETE SET NULL,
  "monitor_id" integer NOT NULL REFERENCES "monitors"("id") ON DELETE CASCADE,
  "incident_id" integer REFERENCES "incidents"("id") ON DELETE SET NULL,
  "event_type" varchar(20) NOT NULL,
  "delivery_status" varchar(10) NOT NULL,
  "status_code" integer,
  "error_message" varchar(500),
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "alert_logs_event_chk" CHECK ("event_type" IN ('down', 'recovery', 'ssl_expiry', 'test')),
  CONSTRAINT "alert_logs_status_chk" CHECK ("delivery_status" IN ('success', 'failed'))
);

CREATE INDEX IF NOT EXISTS "alert_logs_monitor_sent_idx" ON "alert_logs" ("monitor_id", "sent_at" DESC);
CREATE INDEX IF NOT EXISTS "alert_logs_contact_sent_idx" ON "alert_logs" ("contact_id", "sent_at" DESC);
CREATE INDEX IF NOT EXISTS "alert_logs_event_cooldown_idx" ON "alert_logs" ("contact_id", "monitor_id", "event_type", "sent_at" DESC);

-- 4. View: v_monitor_ssl_status (latest SSL inspection per monitor)
CREATE OR REPLACE VIEW v_monitor_ssl_status AS
SELECT
  m.id                     AS monitor_id,
  m.owner_id,
  m.name                   AS monitor_name,
  m.url                    AS monitor_url,
  sc.id                    AS ssl_check_id,
  sc.checked_at,
  sc.is_valid,
  sc.issuer,
  sc.subject,
  sc.valid_from,
  sc.valid_to,
  sc.days_remaining,
  sc.protocol,
  sc.error_message
FROM monitors m
LEFT JOIN LATERAL (
  SELECT s.*
  FROM ssl_checks s
  WHERE s.monitor_id = m.id
  ORDER BY s.checked_at DESC, s.id DESC
  LIMIT 1
) sc ON true;

-- 5. Updated v_monitor_status (includes latest SSL remaining days & validity)
CREATE OR REPLACE VIEW v_monitor_status AS
SELECT
  m.id                     AS monitor_id,
  m.owner_id,
  m.name,
  m.url,
  m.check_interval_seconds,
  lc.id                    AS last_check_id,
  lc.checked_at            AS last_checked_at,
  lc.status_code           AS last_status_code,
  lc.response_time_ms      AS last_response_time_ms,
  lc.error_summary         AS last_error_summary,
  CASE WHEN lc.id IS NULL THEN 'unknown'
       WHEN lc.is_successful THEN 'up'
       ELSE 'down' END     AS current_status,
  (oi.id IS NOT NULL)      AS has_open_incident,
  oi.started_at            AS open_incident_started_at,
  (SELECT COUNT(*)::integer FROM problem_reports pr
    WHERE pr.monitor_id = m.id AND pr.status <> 'dismissed'
      AND pr.created_at >= now() - interval '15 minutes')
                           AS recent_reports_15m,
  lssl.days_remaining      AS ssl_days_remaining,
  lssl.is_valid            AS ssl_is_valid,
  lssl.checked_at          AS ssl_checked_at
FROM monitors m
LEFT JOIN LATERAL (
  SELECT hc.id, hc.checked_at, hc.is_successful, hc.status_code,
         hc.response_time_ms, hc.error_summary
  FROM health_checks hc
  WHERE hc.monitor_id = m.id
  ORDER BY hc.checked_at DESC, hc.id DESC
  LIMIT 1
) lc ON true
LEFT JOIN incidents oi
  ON oi.monitor_id = m.id AND oi.status = 'open'
LEFT JOIN LATERAL (
  SELECT sc.days_remaining, sc.is_valid, sc.checked_at
  FROM ssl_checks sc
  WHERE sc.monitor_id = m.id
  ORDER BY sc.checked_at DESC, sc.id DESC
  LIMIT 1
) lssl ON true;


