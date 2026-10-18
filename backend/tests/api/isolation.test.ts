import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

const app = createApp();

describe("API Security - User Resource Isolation", () => {
  let userACookie: string[];
  let userBCookie: string[];
  let userAMonitorId: number;

  beforeAll(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post("/api/auth/register")
      .send({
        email: `isolation-a-${Date.now()}@pulse.test`,
        password: "password123!",
        displayName: "User A",
      })
      .expect(201);

    userACookie = resA.headers["set-cookie"];

    // User A creates a monitor
    const monitorRes = await request(app)
      .post("/api/monitors")
      .set("Cookie", userACookie)
      .send({
        name: "Private API A",
        url: "http://localhost:4100/svc/shop-api",
      })
      .expect(201);

    userAMonitorId = monitorRes.body.monitor.id;

    // 2. Register User B
    const resB = await request(app)
      .post("/api/auth/register")
      .send({
        email: `isolation-b-${Date.now()}@pulse.test`,
        password: "password123!",
        displayName: "User B",
      })
      .expect(201);

    userBCookie = resB.headers["set-cookie"];
  });

  it("User B accessing User A's monitor returns 404 (not 403)", async () => {
    await request(app)
      .get(`/api/monitors/${userAMonitorId}`)
      .set("Cookie", userBCookie)
      .expect(404);
  });

  it("User B attempting to edit User A's monitor returns 404", async () => {
    await request(app)
      .patch(`/api/monitors/${userAMonitorId}`)
      .set("Cookie", userBCookie)
      .send({ name: "Hacked Name" })
      .expect(404);
  });

  it("User B attempting to trigger check on User A's monitor returns 404", async () => {
    await request(app)
      .post(`/api/monitors/${userAMonitorId}/check`)
      .set("Cookie", userBCookie)
      .expect(404);
  });

  it("User B attempting to delete User A's monitor returns 404", async () => {
    await request(app)
      .delete(`/api/monitors/${userAMonitorId}`)
      .set("Cookie", userBCookie)
      .expect(404);
  });
});
