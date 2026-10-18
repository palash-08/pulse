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
