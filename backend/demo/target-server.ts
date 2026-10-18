import express from "express";

const app = express();
app.use(express.json());

type ServiceMode = "up" | "slow" | "down" | "timeout";

const serviceModes = new Map<string, ServiceMode>();

// Default initial services
const DEFAULT_SERVICES = [
  "shop-api",
  "auth-service",
  "billing-api",
  "search-index",
  "inventory-sync",
];

for (const name of DEFAULT_SERVICES) {
  serviceModes.set(name, "up");
}

// 1. Service endpoint that Pulse monitors
app.get("/svc/:name", (req, res) => {
  const name = req.params.name.toLowerCase();
  const mode = serviceModes.get(name) || "up";

  switch (mode) {
    case "up":
      return res.status(200).json({
        service: name,
        status: "healthy",
        uptimeSeconds: process.uptime(),
        timestamp: new Date().toISOString(),
      });

    case "slow":
      setTimeout(() => {
        if (!res.headersSent) {
          res.status(200).json({
            service: name,
            status: "degraded_performance",
            latencyMs: 1500,
            timestamp: new Date().toISOString(),
          });
        }
      }, 1500);
      return;

    case "down":
      return res.status(503).json({
        service: name,
        status: "service_unavailable",
        error: "Database connection failed",
        timestamp: new Date().toISOString(),
      });

    case "timeout":
      // Do nothing, leave request hanging until client times out
      return;
  }
});

// 2. Control endpoints for testing & demo script
app.get("/control", (_req, res) => {
  const modes: Record<string, ServiceMode> = {};
  for (const [key, value] of serviceModes.entries()) {
    modes[key] = value;
  }
  res.json({ modes });
});

app.post("/control/reset", (_req, res) => {
  for (const key of serviceModes.keys()) {
    serviceModes.set(key, "up");
  }
  for (const name of DEFAULT_SERVICES) {
    serviceModes.set(name, "up");
  }
  res.json({ message: "All services reset to 'up'", modes: Object.fromEntries(serviceModes) });
});

app.post("/control/:name", (req, res) => {
  const name = req.params.name.toLowerCase();
  const { mode } = req.body;

  if (!["up", "slow", "down", "timeout"].includes(mode)) {
    return res.status(400).json({
      error: "Invalid mode. Valid modes are: 'up', 'slow', 'down', 'timeout'",
    });
  }

  serviceModes.set(name, mode as ServiceMode);
  res.json({
    message: `Service '${name}' set to mode '${mode}'`,
    service: name,
    mode,
  });
});

const PORT = 4100;
app.listen(PORT, () => {
  console.log(`🎯 Pulse Demo Target Server running on http://localhost:${PORT}`);
  console.log(`📋 Available services: ${DEFAULT_SERVICES.map((s) => `/svc/${s}`).join(", ")}`);
});
