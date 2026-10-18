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
    await client.query("TRUNCATE TABLE health_checks, incidents, problem_reports, monitors, users, user_sessions CASCADE;");

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

        // Scripted outages:
        // Shop API has outages at step 120-123 and 240-242
        if (mId === shopApiId && ((step >= 120 && step <= 123) || (step >= 240 && step <= 242))) {
          isSuccessful = false;
          statusCode = 503;
          responseTimeMs = null;
          errorSummary = "HTTP 503 Service Unavailable";
        }

        // Billing API has outage at step 160-162
        if (mId === billingApiId && step >= 160 && step <= 162) {
          isSuccessful = false;
          statusCode = null;
          responseTimeMs = null;
          errorSummary = "Connection timed out after 10000ms";
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
