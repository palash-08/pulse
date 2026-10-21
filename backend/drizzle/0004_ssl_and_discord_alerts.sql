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
