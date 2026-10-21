import { sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { monitors } from "../db/schema.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { getDueMonitors } from "../db/queries/monitors.js";
import { executeCheck } from "./checkService.js";
import { executeSslCheck } from "./sslService.js";

const MAX_CONCURRENT_CHECKS = 5;
const activeChecks = new Set<number>();
let schedulerTimer: NodeJS.Timeout | null = null;
let lastDailyMaintenance = 0;

async function runDailyMaintenance(): Promise<void> {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now - lastDailyMaintenance < ONE_DAY_MS) {
    return;
  }
  lastDailyMaintenance = now;

  try {
    logger.info("🧹 Running daily data retention, guest cleanup, and SSL certificate sweep...");
    // 1. Purge health checks older than 30 days
    await db.execute(sql`CALL sp_purge_old_checks(30);`);
    // 2. Remove stale guests older than 7 days
    await db.execute(sql`
      DELETE FROM users
      WHERE is_guest = true AND created_at < now() - interval '7 days';
    `);
    // 3. Daily SSL certificate verification for HTTPS targets
    const httpsMonitors = await db
      .select({ id: monitors.id })
      .from(monitors)
      .where(sql`${monitors.url} ~* '^https://'`);
    
    for (const hm of httpsMonitors) {
      executeSslCheck(hm.id).catch((err) =>
        logger.error(`Daily SSL sweep failed on monitor ${hm.id}:`, err)
      );
    }
    logger.info("✅ Daily maintenance completed successfully.");
  } catch (err) {
    logger.error("❌ Daily maintenance error:", err);
  }
}

async function schedulerTick(): Promise<void> {
  try {
    await runDailyMaintenance();

    // Find due monitors
    const dueMonitors = await getDueMonitors(50);
    if (dueMonitors.length === 0) return;

    for (const monitor of dueMonitors) {
      if (activeChecks.size >= MAX_CONCURRENT_CHECKS) {
        break; // Concurrency cap reached for this tick
      }

      if (activeChecks.has(monitor.monitorId)) {
        continue; // Already being checked
      }

      activeChecks.add(monitor.monitorId);

      // Run check asynchronously without blocking the loop
      executeCheck(monitor.monitorId, "scheduled")
        .catch((err) => {
          logger.error(`Scheduler check error on monitor ${monitor.monitorId}:`, err);
        })
        .finally(() => {
          activeChecks.delete(monitor.monitorId);
        });
    }
  } catch (err) {
    logger.error("Scheduler tick error:", err);
  }
}

export function startScheduler(): void {
  if (!env.SCHEDULER_ENABLED) {
    logger.info("⏸️ Scheduler is disabled via SCHEDULER_ENABLED=false");
    return;
  }

  logger.info(`⏰ Starting in-process scheduler (interval: ${env.SCHEDULER_TICK_SECONDS}s)`);
  schedulerTimer = setInterval(schedulerTick, env.SCHEDULER_TICK_SECONDS * 1000);
  // Run an initial tick after a 2-second delay
  setTimeout(schedulerTick, 2000).unref();
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info("🛑 Scheduler stopped.");
  }
}
