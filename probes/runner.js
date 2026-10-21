#!/usr/bin/env node
/**
 * Pulse Distributed Probe Worker (Node.js)
 * Lightweight, zero-dependency synthetic monitoring agent.
 *
 * Usage:
 *   node probes/runner.js
 * Or with environment variables:
 *   PULSE_URL=https://pulse.example.com PROBE_API_KEY=my_key PROBE_ID=us-east-1 PROBE_REGION=us-east node probes/runner.js
 */

import os from "os";

// --- Configuration ---
const PULSE_URL = (process.env.PULSE_URL || "http://localhost:4000").replace(/\/+$/, "");
const PROBE_API_KEY = process.env.PROBE_API_KEY || "pulse_probe_secret_key_123";
const PROBE_ID = process.env.PROBE_ID || `vm-${os.hostname().toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`;
const PROBE_REGION = process.env.PROBE_REGION || process.env.AWS_REGION || "us-east";
const PROBE_NAME = process.env.PROBE_NAME || `Probe @ ${os.hostname()}`;
const POLL_INTERVAL_SECONDS = parseInt(process.env.POLL_INTERVAL_SECONDS || "30", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5", 10);
const CHECK_TIMEOUT_MS = parseInt(process.env.CHECK_TIMEOUT_MS || "8000", 10);
const JITTER_SECONDS = parseInt(process.env.JITTER_SECONDS || "3", 10);
const RUN_ONCE = process.env.RUN_ONCE === "true" || process.argv.includes("--once");
const ALLOW_PRIVATE_IPS = process.env.ALLOW_PRIVATE_IPS === "true";

function log(level, message, ...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] [${PROBE_ID}] ${message}`, ...args);
}

// Basic SSRF Guard to prevent probes from attacking local VM metadata or loopback
function isDisallowedTarget(urlStr) {
  if (ALLOW_PRIVATE_IPS) return false;
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    // Block AWS/GCP/Azure link-local metadata and loopback
    if (
      host === "169.254.169.254" ||
      host === "metadata.google.internal" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

// Fetch list of active monitors from central Pulse server
async function fetchMonitors() {
  const res = await fetch(`${PULSE_URL}/api/internal/monitors`, {
    method: "GET",
    headers: {
      "x-probe-key": PROBE_API_KEY,
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch monitors (HTTP ${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.monitors || [];
}

// Perform synthetic ping on a single target
async function pingTarget(monitor) {
  if (isDisallowedTarget(monitor.url)) {
    return {
      monitorId: monitor.id,
      isSuccessful: false,
      statusCode: null,
      responseTimeMs: 0,
      errorSummary: "Target URL disallowed by probe security policy (private IP/metadata)",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  const start = performance.now();

  try {
    const response = await fetch(monitor.url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": `Pulse-Probe/${PROBE_ID} (${PROBE_REGION})`,
        "Accept": "*/*",
      },
    });

    const elapsed = Math.round(performance.now() - start);
    clearTimeout(timeoutId);

    const isSuccessful = response.status >= 200 && response.status < 400;
    return {
      monitorId: monitor.id,
      isSuccessful,
      statusCode: response.status,
      responseTimeMs: elapsed,
      errorSummary: isSuccessful ? null : `HTTP ${response.status} ${response.statusText || "Outage"}`,
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    clearTimeout(timeoutId);

    let errorSummary = "Connection error";
    if (err.name === "AbortError") {
      errorSummary = `Timeout after ${CHECK_TIMEOUT_MS}ms`;
    } else if (err.cause?.code) {
      errorSummary = `Network error: ${err.cause.code}`;
    } else if (err.message) {
      errorSummary = err.message.slice(0, 200);
    }

    return {
      monitorId: monitor.id,
      isSuccessful: false,
      statusCode: null,
      responseTimeMs: elapsed,
      errorSummary,
    };
  }
}

// Process targets in concurrent chunks
async function executeBatchChecks(monitors) {
  const results = [];
  const queue = [...monitors];

  async function worker() {
    while (queue.length > 0) {
      const monitor = queue.shift();
      if (!monitor) break;
      const res = await pingTarget(monitor);
      results.push(res);
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, monitors.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// Send results back to Pulse
async function submitResults(results) {
  const payload = {
    probeId: PROBE_ID,
    region: PROBE_REGION,
    probeName: PROBE_NAME,
    results,
  };

  const res = await fetch(`${PULSE_URL}/api/internal/check-results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-probe-key": PROBE_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to submit check results (HTTP ${res.status}): ${errorText}`);
  }

  return await res.json();
}

// Main execution cycle
async function runCycle() {
  try {
    // 1. Jitter delay to stagger concurrent VM probes
    if (JITTER_SECONDS > 0 && !RUN_ONCE) {
      const jitterMs = Math.floor(Math.random() * (JITTER_SECONDS * 1000));
      await new Promise((r) => setTimeout(r, jitterMs));
    }

    // 2. Fetch monitors
    const monitors = await fetchMonitors();
    if (monitors.length === 0) {
      log("INFO", "No active monitors assigned. Skipping check round.");
      return;
    }

    log("INFO", `Checking ${monitors.length} monitors with concurrency ${CONCURRENCY}...`);

    // 3. Ping targets
    const results = await executeBatchChecks(monitors);
    const upCount = results.filter((r) => r.isSuccessful).length;
    const downCount = results.length - upCount;

    // 4. Submit to Pulse
    const submitRes = await submitResults(results);
    log(
      "INFO",
      `Batch submitted: ${results.length} checks (${upCount} UP, ${downCount} DOWN). Pulse response: ${submitRes.message}`
    );
  } catch (err) {
    log("ERROR", `Check cycle failed: ${err.message}`);
  }
}

async function main() {
  log("INFO", `Starting Pulse Probe Runner`);
  log("INFO", `Pulse URL: ${PULSE_URL}`);
  log("INFO", `Probe ID: ${PROBE_ID} | Region: ${PROBE_REGION}`);

  if (RUN_ONCE) {
    log("INFO", "Running in single-shot mode (--once)");
    await runCycle();
    process.exit(0);
  }

  // Continuous loop
  await runCycle();
  setInterval(runCycle, POLL_INTERVAL_SECONDS * 1000);
}

main().catch((err) => {
  console.error("Fatal probe error:", err);
  process.exit(1);
});
