import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { pool } from "./db/client.js";
import { startScheduler, stopScheduler } from "./health/scheduler.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Pulse Backend running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  startScheduler();
});

function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  stopScheduler();
  server.close(async () => {
    logger.info("HTTP server closed.");
    try {
      await pool.end();
      logger.info("Database pool closed.");
    } catch (err) {
      logger.error("Error closing database pool:", err);
    }
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
