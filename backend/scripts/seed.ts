import pg from "pg";
import dotenv from "dotenv";
import { hashPassword } from "../src/lib/password.js";

dotenv.config();

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Refusing to seed database in production environment!");
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log("🌱 Starting deterministic database seeding...");

    // 1. Clean existing records
    await client.query("TRUNCATE TABLE alert_logs, alert_contacts, ssl_checks, health_checks, incidents, problem_reports, monitors, users, user_sessions CASCADE;");

    // 2. Insert Users
    console.log("👤 Creating 10 users (8 registered, 2 guests)...");
    const defaultPasswordHash = await hashPassword("password123!");

    const userInserts = [
      { email: "demo@pulse.test", name: "Demo User", isGuest: false },
      { email: "other@pulse.test", name: "Other User", isGuest: false },
      { email: "alice@pulse.test", name: "Alice Smith", isGuest: false },
      { email: "bob@pulse.test", name: "Bob Jones", isGuest: false },
      { email: "carol@pulse.test", name: "Carol White", isGuest: false },
      { email: "david@pulse.test", name: "David Brown", isGuest: false },
      { email: "eve@pulse.test", name: "Eve Black", isGuest: false },
      { email: "frank@pulse.test", name: "Frank Miller", isGuest: false },
      { email: null, name: null, isGuest: true },
      { email: null, name: null, isGuest: true },
    ];

    const userIds: number[] = [];
    for (const u of userInserts) {
      const res = await client.query(
        `INSERT INTO users (email, display_name, password_hash, is_guest)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [u.email, u.name, u.isGuest ? null : defaultPasswordHash, u.isGuest]
      );
      userIds.push(res.rows[0].id);
    }

    const demoUserId = userIds[0];
    const otherUserId = userIds[1];
    const guest1Id = userIds[8];
    const guest2Id = userIds[9];

    // 3. Insert Monitors (14 monitors)
    console.log("🖥️ Creating 14 monitors...");
    const monitorDefs = [
      // Demo user monitors (5)
      { ownerId: demoUserId, name: "Shop API", url: "http://localhost:4100/svc/shop-api", interval: 60, reportToken: "report-token-demo-shop-api-1234" },
      { ownerId: demoUserId, name: "Auth Service", url: "http://localhost:4100/svc/auth-service", interval: 60, reportToken: null },
      { ownerId: demoUserId, name: "Billing API", url: "http://localhost:4100/svc/billing-api", interval: 60, reportToken: "report-token-demo-billing-1234" },
      { ownerId: demoUserId, name: "Search Index", url: "http://localhost:4100/svc/search-index", interval: 120, reportToken: null },
      { ownerId: demoUserId, name: "Inventory Sync", url: "http://localhost:4100/svc/inventory-sync", interval: 300, reportToken: null },
      // Other user monitors (3)
      { ownerId: otherUserId, name: "Customer Portal", url: "http://localhost:4100/svc/customer-portal", interval: 60, reportToken: null },
      { ownerId: otherUserId, name: "Analytics Collector", url: "http://localhost:4100/svc/analytics-collector", interval: 60, reportToken: null },
      { ownerId: otherUserId, name: "Notification Gateway", url: "http://localhost:4100/svc/notification-gateway", interval: 120, reportToken: null },
      // Other registered users (4)
      { ownerId: userIds[2], name: "Alice Blog", url: "http://localhost:4100/svc/alice-blog", interval: 60, reportToken: null },
      { ownerId: userIds[3], name: "Bob Webhook", url: "http://localhost:4100/svc/bob-webhook", interval: 60, reportToken: null },
      { ownerId: userIds[4], name: "Carol Store", url: "http://localhost:4100/svc/carol-store", interval: 60, reportToken: null },
      { ownerId: userIds[5], name: "David Dashboard", url: "http://localhost:4100/svc/david-dashboard", interval: 60, reportToken: null },
      // Guest users (2)
      { ownerId: guest1Id, name: "Guest Site Alpha", url: "http://localhost:4100/svc/guest-alpha", interval: 60, reportToken: null },
      { ownerId: guest2Id, name: "Guest Site Beta", url: "http://localhost:4100/svc/guest-beta", interval: 60, reportToken: null },
    ];

    const monitorIds: number[] = [];
    for (const m of monitorDefs) {
      const res = await client.query(
        `INSERT INTO monitors (owner_id, name, url, check_interval_seconds, report_token)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [m.ownerId, m.name, m.url, m.interval, m.reportToken]
      );
      monitorIds.push(res.rows[0].id);
    }

    // 4. Chronological Health Checks (~3,000 checks over 7 days)
    // NOTE: We insert checks in chronological order so the trigger automatically creates and resolves incidents!
    console.log("⏱️ Generating ~3,000 health checks across 7 days (trigger creates incidents)...");
    const now = Date.now();
    const intervalMinutes = 30;
    const totalSteps = (7 * 24 * 60) / intervalMinutes; // 336 steps

    // Outage windows relative to step index (e.g. outage between step 100-103, step 200-202)
    // Shop API will have two resolved outages in the past 7 days
    const shopApiId = monitorIds[0];
    const billingApiId = monitorIds[2];

    for (let step = 0; step < totalSteps; step++) {
      const checkTime = new Date(now - (totalSteps - step) * intervalMinutes * 60 * 1000);

      // Check for each monitor
      for (let mIdx = 0; mIdx < monitorIds.length; mIdx++) {
        const mId = monitorIds[mIdx];

        let isSuccessful = true;
        let statusCode: number | null = 200;
        let responseTimeMs: number | null = 100 + Math.floor(Math.sin(step + mIdx) * 40) + (mIdx * 15);
        let errorSummary: string | null = null;

        // Scripted outages (producing 14 distinct incidents across the 7-day timeline):
        // 1. Shop API: 3 incidents (steps 60-62, 120-123, 240-242)
        if (mId === shopApiId && ((step >= 60 && step <= 62) || (step >= 120 && step <= 123) || (step >= 240 && step <= 242))) {
          isSuccessful = false;
          statusCode = 503;
          responseTimeMs = null;
          errorSummary = "HTTP 503 Service Unavailable";
        }

        // 2. Auth Service: 2 incidents (steps 40-41, 200-202)
        if (mId === monitorIds[1] && ((step >= 40 && step <= 41) || (step >= 200 && step <= 202))) {
          isSuccessful = false;
          statusCode = 502;
          responseTimeMs = null;
          errorSummary = "HTTP 502 Bad Gateway (upstream auth worker unreachable)";
        }

        // 3. Billing API: 2 incidents (steps 90-92, 160-162)
        if (mId === billingApiId && ((step >= 90 && step <= 92) || (step >= 160 && step <= 162))) {
          isSuccessful = false;
          statusCode = null;
          responseTimeMs = null;
          errorSummary = "Connection timed out after 10000ms";
        }

        // 4. Search Index: 1 incident (steps 140-142)
        if (mId === monitorIds[3] && step >= 140 && step <= 142) {
          isSuccessful = false;
          statusCode = 504;
          responseTimeMs = null;
          errorSummary = "HTTP 504 Gateway Timeout";
        }

        // 5. Customer Portal: 2 incidents (steps 80-82, 220-222)
        if (mId === monitorIds[5] && ((step >= 80 && step <= 82) || (step >= 220 && step <= 222))) {
          isSuccessful = false;
          statusCode = 500;
          responseTimeMs = null;
          errorSummary = "HTTP 500 Internal Server Error";
        }

        // 6. Alice Blog: 1 incident (steps 70-71)
        if (mId === monitorIds[8] && step >= 70 && step <= 71) {
          isSuccessful = false;
          statusCode = 521;
          responseTimeMs = null;
          errorSummary = "Web server is down";
        }

        // 7. Bob Webhook: 1 incident (steps 180-182)
        if (mId === monitorIds[9] && step >= 180 && step <= 182) {
          isSuccessful = false;
          statusCode = 429;
          responseTimeMs = null;
          errorSummary = "HTTP 429 Too Many Requests";
        }

        // 8. Carol Store: 1 incident (steps 260-262)
        if (mId === monitorIds[10] && step >= 260 && step <= 262) {
          isSuccessful = false;
          statusCode = 503;
          responseTimeMs = null;
          errorSummary = "HTTP 503 Service Unavailable";
        }

        // 9. Guest Site Alpha: 1 open incident near the end (steps 330-335)
        if (mId === monitorIds[12] && step >= 330) {
          isSuccessful = false;
          statusCode = 503;
          responseTimeMs = null;
          errorSummary = "HTTP 503 Service Unavailable (DNS failure)";
        }

        await client.query(
          `INSERT INTO health_checks (monitor_id, checked_at, is_successful, status_code, response_time_ms, error_summary, trigger_source)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [mId, checkTime, isSuccessful, statusCode, responseTimeMs, errorSummary, step % 10 === 0 ? "manual" : "scheduled"]
        );
      }
    }

    // 5. Problem Reports (12 reports)
    console.log("📝 Creating 12 problem reports...");
    const reportDefs = [
      { monitorId: shopApiId, category: "down", desc: "Checkout page gives 503 error", email: "customer1@example.com", status: "resolved" },
      { monitorId: shopApiId, category: "slow", desc: "Product listing taking over 5 seconds to load", email: null, status: "acknowledged" },
      { monitorId: shopApiId, category: "error", desc: "API returning 500 on promo code validation", email: "user9@example.com", status: "new" },
      { monitorId: shopApiId, category: "down", desc: "Cart unavailable from mobile browser", email: null, status: "new" },
      { monitorId: billingApiId, category: "down", desc: "Stripe webhook failing intermittently", email: "finance@partner.com", status: "resolved" },
      { monitorId: billingApiId, category: "error", desc: "Invoice PDF download returns zero bytes", email: null, status: "dismissed" },
      { monitorId: billingApiId, category: "slow", desc: "Payment confirmation takes 10+ seconds", email: "buyer@example.com", status: "new" },
      { monitorId: monitorIds[1], category: "error", desc: "Cannot reset password link expires immediately", email: null, status: "new" },
      { monitorId: monitorIds[3], category: "slow", desc: "Search results pagination is unresponsive", email: null, status: "acknowledged" },
      { monitorId: monitorIds[5], category: "down", desc: "Portal login page shows white screen", email: "client@test.com", status: "new" },
      { monitorId: monitorIds[6], category: "other", desc: "Data sync seems delayed by ~30 minutes", email: null, status: "new" },
      { monitorId: monitorIds[7], category: "down", desc: "SMS alerts not triggering", email: null, status: "resolved" },
    ];

    for (const r of reportDefs) {
      await client.query(
        `INSERT INTO problem_reports (monitor_id, category, description, reporter_email, status, created_at)
         VALUES ($1, $2, $3, $4, $5, now() - interval '2 hours')`,
        [r.monitorId, r.category, r.desc, r.email, r.status]
      );
    }

    // 6. Alert Contacts (Discord Webhook Destinations)
    console.log("🔔 Creating Discord alert contacts...");
    const contactRes = await client.query(
      `INSERT INTO alert_contacts (user_id, type, name, webhook_url, is_active, cooldown_minutes, notify_on_down, notify_on_recovery, notify_on_ssl_expiry)
       VALUES ($1, 'discord', 'DevOps Team Alerts', 'https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz0123456789_sample_token', true, 15, true, true, true)
       RETURNING id`,
      [demoUserId]
    );
    const demoContactId = contactRes.rows[0].id;

    // 7. SSL Certificate Checks
    console.log("🔒 Seeding SSL certificate inspection data...");
    await client.query(
      `INSERT INTO ssl_checks (monitor_id, checked_at, is_valid, issuer, subject, valid_from, valid_to, days_remaining, protocol, error_message)
       VALUES
       ($1, now() - interval '1 hour', true, 'Let''s Encrypt Authority X3 (R3)', 'CN=api.pulse.dev', now() - interval '30 days', now() + interval '60 days', 60, 'TLSv1.3', null),
       ($2, now() - interval '1 hour', true, 'DigiCert Global Root G2', 'CN=auth.pulse.dev', now() - interval '200 days', now() + interval '12 days', 12, 'TLSv1.3', null)`,
      [shopApiId, billingApiId]
    );

    // 8. Alert Logs
    console.log("📜 Seeding alert delivery logs...");
    await client.query(
      `INSERT INTO alert_logs (contact_id, monitor_id, event_type, delivery_status, status_code, sent_at)
       VALUES
       ($1, $2, 'down', 'success', 204, now() - interval '3 days'),
       ($1, $2, 'recovery', 'success', 204, now() - interval '3 days' + interval '6 minutes'),
       ($1, $3, 'down', 'success', 204, now() - interval '1 day'),
       ($1, $3, 'recovery', 'success', 204, now() - interval '1 day' + interval '8 minutes'),
       ($1, $3, 'ssl_expiry', 'success', 204, now() - interval '2 hours')`,
      [demoContactId, shopApiId, billingApiId]
    );

    console.log("✅ Seeding completed successfully!");
    console.log("🔑 Demo account credentials:");
    console.log("   Email:    demo@pulse.test");
    console.log("   Password: password123!");
    console.log("   Other:    other@pulse.test (password: password123!)");
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
