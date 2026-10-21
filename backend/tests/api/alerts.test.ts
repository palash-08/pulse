import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";

const app = createApp();

describe("Alerts & Discord Notification Dispatcher API", () => {
  let userCookie: string[];
  let contactId: number;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: `alerts-tester-${Date.now()}@pulse.test`,
        password: "password123!",
        displayName: "Alert Tester",
      })
      .expect(201);

    const rawCookie = res.headers["set-cookie"];
    userCookie = Array.isArray(rawCookie) ? rawCookie : [String(rawCookie)];
  });

  it("rejects non-Discord webhook URLs", async () => {
    const res = await request(app)
      .post("/api/alerts/contacts")
      .set("Cookie", userCookie)
      .send({
        name: "Malicious Webhook",
        webhookUrl: "https://evil-attacker.com/webhook",
      });

    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body.error)).toContain("Discord");
  });

  it("creates a valid Discord alert contact", async () => {
    const res = await request(app)
      .post("/api/alerts/contacts")
      .set("Cookie", userCookie)
      .send({
        name: "DevOps Discord Channel",
        webhookUrl: "https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz_secret",
        cooldownMinutes: 15,
        notifyOnDown: true,
        notifyOnRecovery: true,
        notifyOnSslExpiry: true,
      })
      .expect(201);

    expect(res.body.contact.id).toBeDefined();
    expect(res.body.contact.name).toBe("DevOps Discord Channel");
    expect(res.body.contact.maskedWebhookUrl).toBeDefined();
    expect(res.body.contact.maskedWebhookUrl).not.toContain("abcdefghijklmnopqrstuvwxyz_secret");
    contactId = res.body.contact.id;
  });

  it("lists alert contacts with masked webhook URLs", async () => {
    const res = await request(app)
      .get("/api/alerts/contacts")
      .set("Cookie", userCookie)
      .expect(200);

    expect(res.body.contacts).toBeInstanceOf(Array);
    expect(res.body.contacts.length).toBeGreaterThanOrEqual(1);
    const found = res.body.contacts.find((c: any) => c.id === contactId);
    expect(found).toBeDefined();
    expect(found.maskedWebhookUrl).toContain("••••");
  });

  it("updates alert contact settings and cooldown", async () => {
    const res = await request(app)
      .patch(`/api/alerts/contacts/${contactId}`)
      .set("Cookie", userCookie)
      .send({
        name: "Updated DevOps Alerts",
        cooldownMinutes: 30,
        notifyOnSslExpiry: false,
      })
      .expect(200);

    expect(res.body.contact.name).toBe("Updated DevOps Alerts");
    expect(res.body.contact.cooldownMinutes).toBe(30);
    expect(res.body.contact.notifyOnSslExpiry).toBe(false);
  });

  it("lists alert logs for the user", async () => {
    const res = await request(app)
      .get("/api/alerts/logs")
      .set("Cookie", userCookie)
      .expect(200);

    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.total).toBeDefined();
  });

  it("deletes an alert contact", async () => {
    await request(app)
      .delete(`/api/alerts/contacts/${contactId}`)
      .set("Cookie", userCookie)
      .expect(204);

    const checkRes = await request(app)
      .get(`/api/alerts/contacts/${contactId}`)
      .set("Cookie", userCookie);

    expect(checkRes.status).toBe(404);
  });
});
