# Pulse Distributed Probes (Multi-VM Synthetic Monitoring)

Run lightweight synthetic monitoring runners on multiple Virtual Machines across various cloud providers, regions, or private networks to ping your targets and report latency, availability, and error codes back to Pulse.

---

## 🌟 How It Works

```
  ┌─────────────────────────────────────────────────────────┐
  │                    Central Pulse API                    │
  │     GET /api/internal/monitors                          │
  │     POST /api/internal/check-results                    │
  │     (PostgreSQL Quorum Trigger: M-of-N Consensus)       │
  └───────────────▲─────────────────────────▲───────────────┘
                  │                         │
         Outbound HTTPS only       Outbound HTTPS only
                  │                         │
     ┌────────────┴────────────┐       ┌────┴────────────────────┐
     │   VM 1 (US-East-1)      │       │   VM 2 (Frankfurt, EU)  │
     │   probes/runner.js      │       │   probes/runner.js      │
     └────────────┬────────────┘       └────┬────────────────────┘
                  │                         │
                  └────────► Target URL ◄───┘
```

1. **Outbound Only**: Probe VMs only initiate outbound connections to Pulse and to the target URLs. No open inbound ports or public IPs are required on the VMs.
2. **Multi-Probe Quorum (Consensus)**:
   - When $\ge 2$ probes are active, PostgreSQL enforces an **$M$-of-$N$ quorum** before opening an incident. If one probe suffers a local ISP or regional routing issue, it **will not trigger a false alert**.
   - An incident is only opened when at least **2 distinct probe locations** confirm the outage.
   - If only 1 probe is active in the fleet, Pulse automatically collapses the threshold to 1.

---

## 🚀 Setup on Any VM

### Option A: Node.js Runner (Recommended)
Zero external npm dependencies required (uses native Node 18+ `fetch` and `performance.now()`).

```bash
# 1. Clone or copy probes/runner.js to your VM
scp probes/runner.js user@vm-ip:~/runner.js

# 2. Run with environment variables
export PULSE_URL="https://your-pulse-server.com"
export PROBE_API_KEY="pulse_probe_secret_key_123"
export PROBE_ID="vm-aws-us-east-1"
export PROBE_REGION="us-east-1"
export POLL_INTERVAL_SECONDS=30
export CONCURRENCY=5

node runner.js
```

### Option B: Python 3 Runner
Standard library only (zero `pip` dependencies):
```bash
export PULSE_URL="https://your-pulse-server.com"
export PROBE_API_KEY="pulse_probe_secret_key_123"
export PROBE_ID="vm-do-fra1"
export PROBE_REGION="eu-central"

python3 probes/probe.py
```

### Option C: Bash + Curl (Ultra-Lightweight / Cron)
Requires only `curl` and `jq`:
```bash
chmod +x probes/probe.sh
PULSE_URL="https://your-pulse-server.com" PROBE_REGION="ap-south" ./probes/probe.sh
```

---

## ⚙️ Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PULSE_URL` | `http://localhost:4000` | Base URL of your central Pulse server. |
| `PROBE_API_KEY` | `pulse_probe_secret_key_123` | Shared secret key configured in Pulse (`INTERNAL_PROBE_API_KEY`). |
| `PROBE_ID` | `vm-<hostname>` | Unique identifier for this VM instance. |
| `PROBE_REGION` | `us-east` | Geographic region or network tag (e.g. `eu-central`, `us-west-2`, `home-lab`). |
| `PROBE_NAME` | `Probe @ <hostname>` | Optional human-friendly name. |
| `POLL_INTERVAL_SECONDS`| `30` | Interval between monitoring rounds. |
| `CONCURRENCY` | `5` | Number of targets to ping in parallel. |
| `CHECK_TIMEOUT_MS` | `8000` | Request timeout per target in milliseconds. |
| `JITTER_SECONDS` | `3` | Random delay (0-N seconds) before each round to prevent thundering herds. |
| `RUN_ONCE` | `false` | Set to `true` or pass `--once` for cron job executions. |
| `ALLOW_PRIVATE_IPS` | `false` | By default, private IPs (`10.*`, `192.168.*`, `169.254.169.254`) are blocked (SSRF guard). Set `true` if monitoring internal infrastructure. |

---

## 🛠️ Production Daemon Setup (systemd)

On Ubuntu/Debian/CentOS, create a systemd service so the probe starts automatically on boot and auto-restarts on failure:

1. Create `/etc/systemd/system/pulse-probe.service`:
```ini
[Unit]
Description=Pulse Distributed Probe Agent
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
Environment=PULSE_URL=https://pulse.yourdomain.com
Environment=PROBE_API_KEY=your_secure_internal_probe_key
Environment=PROBE_ID=vm-oracle-frankfurt
Environment=PROBE_REGION=eu-central
Environment=POLL_INTERVAL_SECONDS=30
ExecStart=/usr/bin/node /home/ubuntu/runner.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pulse-probe
sudo journalctl -u pulse-probe -f
```

---

## 🕒 Crontab Execution (Alternative)

If you prefer cron instead of a long-running process:
```bash
# Run every minute via cron
* * * * * PULSE_URL=https://pulse.yourdomain.com PROBE_API_KEY=your_key RUN_ONCE=true /usr/bin/node /home/ubuntu/runner.js >> /var/log/pulse-probe.log 2>&1
```

---

## 📡 Pulse Internal API Endpoints

All internal probe endpoints require authentication via `x-probe-key: <key>` or `Authorization: Bearer <key>`.

* **`GET /api/internal/monitors`**:
  Returns list of active monitors with `id`, `name`, `url`, and `checkIntervalSeconds`.
* **`POST /api/internal/check-results`**:
  Receives a batch of results from a probe node. Upserts the probe into `probe_nodes` and inserts health check records into `health_checks`.
* **`GET /api/internal/probes`**:
  Returns all registered probe nodes and their `last_seen_at` heartbeat timestamps.
