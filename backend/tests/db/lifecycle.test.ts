import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe("Database Triggers & Lifecycle Engine", () => {
  let client: pg.Client;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: testDbUrl });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it("enforces guest monitor limit (GL001) at database trigger level", async () => {
    // Create guest user
    const userRes = await client.query(
      "INSERT INTO users (is_guest) VALUES (true) RETURNING id"
    );
    const guestId = userRes.rows[0].id;

    // First monitor: should succeed
    await client.query(
      "INSERT INTO monitors (owner_id, name, url) VALUES ($1, 'Site 1', 'http://localhost:4100/svc/1')",
      [guestId]
    );

    // Second monitor: should succeed
    await client.query(
      "INSERT INTO monitors (owner_id, name, url) VALUES ($1, 'Site 2', 'http://localhost:4100/svc/2')",
      [guestId]
    );

    // Third monitor: must be rejected by trigger with SQLSTATE GL001
    await expect(
      client.query(
        "INSERT INTO monitors (owner_id, name, url) VALUES ($1, 'Site 3', 'http://localhost:4100/svc/3')",
        [guestId]
      )
    ).rejects.toMatchObject({
      code: "GL001",
    });
  });

  it("handles incident lifecycle purely through PostgreSQL triggers", async () => {
    // Clean up or use dynamic email
    const email = `lifecycle-${Date.now()}@pulse.test`;
    // Create registered user and monitor
    const uRes = await client.query(
      `INSERT INTO users (email, display_name, password_hash, is_guest)
       VALUES ($1, 'Tester', '$argon2id$mock', false)
       RETURNING id`,
      [email]
    );
    const userId = uRes.rows[0].id;

    const mRes = await client.query(
      `INSERT INTO monitors (owner_id, name, url)
       VALUES ($1, 'Incident Test API', 'http://localhost:4100/svc/test')
       RETURNING id`,
      [userId]
    );
    const monitorId = mRes.rows[0].id;

    // 1. First failing check: trigger opens an incident
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, error_summary)
       VALUES ($1, false, 503, 'HTTP 503 Outage')`,
      [monitorId]
    );

    const incRes1 = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(incRes1.rows.length).toBe(1);
    const openIncidentId = incRes1.rows[0].id;
    expect(incRes1.rows[0].resolved_at).toBeNull();

    // 2. Second failing check: trigger deduplicates (NO second open incident)
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, error_summary)
       VALUES ($1, false, 503, 'HTTP 503 Still Down')`,
      [monitorId]
    );

    const incRes2 = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(incRes2.rows.length).toBe(1);
    expect(incRes2.rows[0].id).toBe(openIncidentId);

    // 3. Successful check: trigger resolves the open incident
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, response_time_ms)
       VALUES ($1, true, 200, 120)`,
      [monitorId]
    );

    const incRes3 = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(incRes3.rows.length).toBe(0);

    const resolvedIncRes = await client.query(
      "SELECT * FROM incidents WHERE id = $1",
      [openIncidentId]
    );
    expect(resolvedIncRes.rows[0].status).toBe("resolved");
    expect(resolvedIncRes.rows[0].resolved_at).not.toBeNull();

    // 4. Subsequent failure: trigger opens a NEW incident
    await client.query(
      `INSERT INTO health_checks (monitor_id, is_successful, status_code, error_summary)
       VALUES ($1, false, 500, 'HTTP 500 New Outage')`,
      [monitorId]
    );

    const incRes4 = await client.query(
      "SELECT * FROM incidents WHERE monitor_id = $1 AND status = 'open'",
      [monitorId]
    );
    expect(incRes4.rows.length).toBe(1);
    expect(incRes4.rows[0].id).not.toBe(openIncidentId);
  });
});
