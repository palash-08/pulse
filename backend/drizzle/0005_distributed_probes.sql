-- =============================================================================
-- Migration 0005: Distributed Multi-VM Probes & Quorum Incident Lifecycle
-- =============================================================================

-- 1. Add probe_id and region to health_checks
ALTER TABLE "health_checks" ADD COLUMN IF NOT EXISTS "probe_id" varchar(100);
ALTER TABLE "health_checks" ADD COLUMN IF NOT EXISTS "region" varchar(100);

-- 2. Update trigger_source check constraint to allow 'probe'
ALTER TABLE "health_checks" DROP CONSTRAINT IF EXISTS "hc_trigger_chk";
ALTER TABLE "health_checks" ADD CONSTRAINT "hc_trigger_chk" 
  CHECK ("trigger_source" IN ('scheduled', 'manual', 'probe'));

-- 3. Fast lookup index for quorum evaluation per monitor per probe
CREATE INDEX IF NOT EXISTS "health_checks_probe_time_idx" 
  ON "health_checks" ("monitor_id", "probe_id", "checked_at" DESC);

-- 4. Probe Nodes registry (tracks active VMs, region, and last heartbeat)
CREATE TABLE IF NOT EXISTS "probe_nodes" (
  "id" varchar(100) PRIMARY KEY,
  "region" varchar(100) NOT NULL,
  "name" varchar(100),
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Updated incident lifecycle trigger function with Multi-Probe Quorum Logic
CREATE OR REPLACE FUNCTION fn_apply_health_check_to_incidents()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_open_incident_id integer;
  v_interval_seconds integer := 60;
  v_window_seconds integer;
  v_distinct_probes_reporting integer := 0;
  v_failed_probes_count integer := 0;
  v_quorum_threshold integer := 2;
BEGIN
  -- (A) Single-node / Local checks (probe_id IS NULL or empty)
  -- Preserves default instant open/resolve behavior for local scheduler & manual checks
  IF NEW.probe_id IS NULL OR btrim(NEW.probe_id) = '' THEN
    IF NEW.is_successful THEN
      UPDATE incidents
         SET status = 'resolved',
             resolved_at = GREATEST(NEW.checked_at, started_at)
       WHERE monitor_id = NEW.monitor_id AND status = 'open';
    ELSE
      INSERT INTO incidents (monitor_id, status, started_at)
      VALUES (NEW.monitor_id, 'open', NEW.checked_at)
      ON CONFLICT (monitor_id) WHERE status = 'open' DO NOTHING;
    END IF;
    RETURN NULL;
  END IF;

  -- (B) Distributed Multi-Probe Quorum Logic
  -- Determine sliding window based on monitor's configured check interval (3x interval, min 5 minutes)
  SELECT check_interval_seconds INTO v_interval_seconds
  FROM monitors WHERE id = NEW.monitor_id;

  v_window_seconds := GREATEST(300, COALESCE(v_interval_seconds, 60) * 3);

  -- Retrieve latest check status from each distinct probe within the sliding window
  WITH latest_per_probe AS (
    SELECT DISTINCT ON (probe_id)
      probe_id,
      is_successful,
      checked_at
    FROM health_checks
    WHERE monitor_id = NEW.monitor_id
      AND probe_id IS NOT NULL
      AND checked_at >= now() - make_interval(secs => v_window_seconds)
    ORDER BY probe_id, checked_at DESC, id DESC
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE NOT is_successful)
  INTO
    v_distinct_probes_reporting,
    v_failed_probes_count
  FROM latest_per_probe;

  -- Dynamic quorum threshold:
  -- If only 1 probe is currently active/reporting in the fleet, quorum threshold is 1.
  -- If 2 or more probes are reporting, require at least 2 distinct probes to agree on failure.
  IF v_distinct_probes_reporting < 2 THEN
    v_quorum_threshold := 1;
  ELSE
    v_quorum_threshold := 2;
  END IF;

  -- Check existing open incident
  SELECT id INTO v_open_incident_id
  FROM incidents
  WHERE monitor_id = NEW.monitor_id AND status = 'open'
  LIMIT 1;

  IF NEW.is_successful THEN
    -- Recovery: Resolve incident if failed probes drops below quorum threshold
    IF v_open_incident_id IS NOT NULL AND v_failed_probes_count < v_quorum_threshold THEN
      UPDATE incidents
         SET status = 'resolved',
             resolved_at = GREATEST(NEW.checked_at, started_at)
       WHERE id = v_open_incident_id;
    END IF;
  ELSE
    -- Outage: Open incident only if quorum threshold is reached
    IF v_failed_probes_count >= v_quorum_threshold THEN
      INSERT INTO incidents (monitor_id, status, started_at)
      VALUES (NEW.monitor_id, 'open', NEW.checked_at)
      ON CONFLICT (monitor_id) WHERE status = 'open' DO NOTHING;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;
