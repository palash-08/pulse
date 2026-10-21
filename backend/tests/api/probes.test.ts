import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = createApp();
const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe("Distributed Probes Internal API", () => {
  let client: pg.Client;
  let monitorId: number;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: testDbUrl });
    await client.connect();

    // Create a user and a monitor to test with
    const uRes = await client.query(
      `INSERT INTO users (email, display_name, password_hash, is_guest)
       VALUES ($1, 'Probe Tester', '$argon2id$mock', false)
       RETURNING id`,
      [`probe-tester-${Date.now()}@pulse.test`]
    );
    const userId = uRes.rows[0].id;

    const mRes = await client.query(
      `INSERT INTO monitors (owner_id, name, url, check_interval_seconds)
       VALUES ($1, 'Target Service', 'http://localhost:4100/health', 60)
       RETURNING id`,
      [userId]
    );
    monitorId = mRes.rows[0].id;
  });

  it("rejects unauthorized requests with missing or invalid probe key", async () => {
    // Missing key
    const resNoKey = await request(app)
      .get("/api/internal/monitors")
      .expect(401);
    expect(resNoKey.body.error.message).toContain("probe API key");

    // Invalid key
    const resBadKey = await request(app)
      .get("/api/internal/monitors")
      .set("x-probe-key", "wrong-secret-key")
      .expect(401);
    expect(resBadKey.body.error.message).toContain("probe API key");
  });

  it("allows access with x-probe-key header", async () => {
    const res = await request(app)
      .get("/api/internal/monitors")
      .set("x-probe-key", env.INTERNAL_PROBE_API_KEY)
      .expect(200);

    expect(Array.isArray(res.body.monitors)).toBe(true);
    expect(res.body.monitors.some((m: any) => m.id === monitorId)).toBe(true);
  });

  it("allows access with Bearer token authorization header", async () => {
    const res = await request(app)
      .get("/api/internal/monitors")
      .set("Authorization", `Bearer ${env.INTERNAL_PROBE_API_KEY}`)
      .expect(200);

    expect(Array.isArray(res.body.monitors)).toBe(true);
  });

  it("validates and accepts check results from a probe VM", async () => {
    const res = await request(app)
      .post("/api/internal/check-results")
      .set("x-probe-key", env.INTERNAL_PROBE_API_KEY)
      .send({
        probeId: "vm-frankfurt-01",
        region: "eu-central",
        probeName: "Frankfurt Droplet",
        results: [
          {
            monitorId,
            isSuccessful: true,
            statusCode: 200,
            responseTimeMs: 35,
          },
        ],
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.recorded).toBe(1);
    expect(res.body.data.probeId).toBe("vm-frankfurt-01");

    // Verify stored in health_checks with probe metadata
    const hcRes = await client.query(
      `SELECT * FROM health_checks WHERE monitor_id = $1 AND probe_id = $2 ORDER BY id DESC LIMIT 1`,
      [monitorId, "vm-frankfurt-01"]
    );
    expect(hcRes.rows.length).toBe(1);
    expect(hcRes.rows[0].region).toBe("eu-central");
    expect(hcRes.rows[0].trigger_source).toBe("probe");
    expect(hcRes.rows[0].response_time_ms).toBe(35);
  });

  it("lists registered active probe nodes", async () => {
    const res = await request(app)
      .get("/api/internal/probes")
      .set("x-probe-key", env.INTERNAL_PROBE_API_KEY)
      .expect(200);

    expect(Array.isArray(res.body.probes)).toBe(true);
    const probe = res.body.probes.find((p: any) => p.id === "vm-frankfurt-01");
    expect(probe).toBeDefined();
    expect(probe.region).toBe("eu-central");
  });
});
