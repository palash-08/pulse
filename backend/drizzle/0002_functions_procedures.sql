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
