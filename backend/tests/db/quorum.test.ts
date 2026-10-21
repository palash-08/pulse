import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe("Multi-Probe Consensus & Quorum Engine", () => {
  let client: pg.Client;
  let userId: number;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: testDbUrl });
    await client.connect();

    const uRes = await client.query(
      `INSERT INTO users (email, display_name, password_hash, is_guest)
       VALUES ($1, 'Quorum Tester', '$argon2id$mock', false)
       RETURNING id`,
      [`quorum-tester-${Date.now()}@pulse.test`]
    );
    userId = uRes.rows[0].id;
  });

  afterAll(async () => {
    await client.end();
  });

  it("prevents false alarm: 1 probe failure out of 3 active probes does NOT open an incident", async () => {
    const mRes = await client.query(
      `INSERT INTO monitors (owner_id, name, url, check_interval_seconds)
       VALUES ($1, 'Quorum Test API 1', 'http://localhost:4100/api/1', 60)
       RETURNING id`,
      [userId]
    );
    const monitorId = mRes.rows[0].id;

    // 1. Establish 3 active probes in the fleet with initial successful checks
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, response_time_ms, trigger_source, probe_id, region)
       VALUES 
         ($1, true, 200, 45, 'probe', 'probe-us-east', 'us-east'),
         ($1, true, 200, 55, 'probe', 'probe-eu-west', 'eu-west'),
         ($1, true, 200, 60, 'probe', 'probe-ap-south', 'ap-south')`,
      [monitorId]
    );

    // Verify no incident is open
    const initialInc = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(initialInc.rows.length).toBe(0);

    // 2. ONLY probe-us-east reports a failure (e.g. transient regional network glitch)
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, error_summary, trigger_source, probe_id, region)
       VALUES ($1, false, 502, 'Bad Gateway from US', 'probe', 'probe-us-east', 'us-east')`,
      [monitorId]
    );

    // Verify: Incident is NOT opened because 2 of 3 probes are still healthy (quorum requires >= 2 failures)
    const afterOneFailure = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(afterOneFailure.rows.length).toBe(0);

    // 3. Second probe (probe-eu-west) confirms failure: Quorum reached (2 of 3 failed)!
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, error_summary, trigger_source, probe_id, region)
       VALUES ($1, false, 502, 'Bad Gateway from EU', 'probe', 'probe-eu-west', 'eu-west')`,
      [monitorId]
    );

    // Verify: Incident is now OPENED!
    const afterTwoFailures = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(afterTwoFailures.rows.length).toBe(1);
    expect(afterTwoFailures.rows[0].status).toBe("open");

    // 4. Target recovers: probe-us-east reports healthy (failed count drops to 1, below quorum)
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, response_time_ms, trigger_source, probe_id, region)
       VALUES ($1, true, 200, 42, 'probe', 'probe-us-east', 'us-east')`,
      [monitorId]
    );

    // Verify: Incident is automatically RESOLVED!
    const afterRecovery = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(afterRecovery.rows.length).toBe(0);

    const resolvedInc = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'resolved'",
      [monitorId]
    );
    expect(resolvedInc.rows.length).toBe(1);
    expect(resolvedInc.rows[0].resolved_at).not.toBeNull();
  });

  it("handles single probe deployment gracefully: collapses quorum to 1 probe threshold", async () => {
    const mRes = await client.query(
      `INSERT INTO monitors (owner_id, name, url, check_interval_seconds)
       VALUES ($1, 'Solo Probe Monitor', 'http://localhost:4100/api/solo', 60)
       RETURNING id`,
      [userId]
    );
    const monitorId = mRes.rows[0].id;

    // Only 1 probe exists in the fleet
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, error_summary, trigger_source, probe_id, region)
       VALUES ($1, false, 500, 'Internal Server Error', 'probe', 'probe-solo-node', 'us-west')`,
      [monitorId]
    );

    // Since only 1 probe is active, quorum threshold collapses to 1, so incident is opened
    const soloInc = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(soloInc.rows.length).toBe(1);

    // When that probe reports success, it resolves
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, response_time_ms, trigger_source, probe_id, region)
       VALUES ($1, true, 200, 50, 'probe', 'probe-solo-node', 'us-west')`,
      [monitorId]
    );

    const resolvedSolo = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(resolvedSolo.rows.length).toBe(0);
  });
});
