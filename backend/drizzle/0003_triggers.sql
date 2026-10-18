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
