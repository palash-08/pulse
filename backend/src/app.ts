import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { env } from "./config/env.js";
import { sessionMiddleware } from "./middleware/session.js";
import { originCheck } from "./middleware/originCheck.js";
import { populateUser } from "./middleware/requireUser.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { checkDatabaseConnection } from "./db/client.js";
import { NotFoundError } from "./lib/errors.js";

import authRoutes from "./modules/auth/auth.routes.js";
import accountRoutes from "./modules/account/account.routes.js";
import monitorsRoutes from "./modules/monitors/monitors.routes.js";
import incidentsRoutes from "./modules/incidents/incidents.routes.js";
import reportsRoutes from "./modules/reports/reports.routes.js";
import publicRoutes from "./modules/public/public.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Trust reverse proxy (Nginx) for X-Forwarded-Proto and secure session cookies
  app.set("trust proxy", 1);

  // 1. Security & request processing middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // Handled by frontend or reverse proxy
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false }));

  // 2. Session & User population
  app.use(sessionMiddleware);
  app.use(originCheck);
  app.use(populateUser);

  // 3. Health check (unauthenticated, verifies database round trip)
  app.get("/api/health", async (_req, res, next) => {
    try {
      await checkDatabaseConnection();
      res.status(200).json({ status: "ok" });
    } catch (err) {
      next(err);
    }
  });

  // 4. API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/monitors", monitorsRoutes);
  app.use("/api/incidents", incidentsRoutes);
  app.use("/api/problem-reports", reportsRoutes);
  app.use("/api/public", publicRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  // 5. Production static serving
  if (env.NODE_ENV === "production") {
    const frontendDist = path.resolve(__dirname, "../../frontend/dist");
    if (fs.existsSync(frontendDist)) {
      app.use(express.static(frontendDist));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/")) {
          return next(new NotFoundError("Endpoint not found"));
        }
        res.sendFile(path.join(frontendDist, "index.html"));
      });
    }
  }

  // 6. Catch-all for unknown API endpoints
  app.use("/api/*", (_req, _res, next) => {
    next(new NotFoundError("Endpoint not found"));
  });

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
