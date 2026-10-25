# Pulse

> The heartbeat of your infrastructure.
> DBMS Laboratory (24CS305/CS3106) Group Mini Project.

Pulse is a lightweight uptime monitoring and response-time tracking platform. It uses PostgreSQL as its core engine to manage incident lifecycles, enforce guest limits, compute statistics without drift, track TLS/SSL certificates, dispatch Discord webhook alerts, and handle data retention.

---

## Key Features

- **Database-Driven Incident Lifecycle**: PostgreSQL `AFTER INSERT` trigger on `health_checks` automatically opens incidents upon check failure (with partial unique index race prevention) and resolves them upon service recovery without application-layer drift.
- **TLS / SSL Certificate Monitoring**: Automated inspection of remote SSL/TLS certificates, validating expiry countdowns (`daysRemaining`), protocol versions, issuers, and alerting before expiration.
- **Discord Webhook Alerts**: Real-time notifications dispatched to Discord channels for incident triggers (`down`, `recovery`), SSL expiry warnings, and test pings, with built-in cooldowns and in-flight deduplication.
- **Guest Tier Enforcement**: `BEFORE INSERT` trigger on `monitors` locks the user row and authoritatively enforces a 2-monitor limit for guest accounts with SQLSTATE `GL001`.
- **SSRF Protection Engine**: Strict DNS resolution, blocked IP ranges (loopback, link-local, private, IPv6-mapped), manual redirect re-validation, and request size/timeout caps.
- **Rocket Theme Switcher**: Bidirectional light/dark theme system powered by native View Transitions API and GSAP rocket animation with mathematical flame-aperture clipping mask and instant no-FOUC persistence.
- **Unguessable Problem Reports**: Opt-in public report tokens allowing external visitors to report issues with honeypot bot defense and IP rate limits.
- **Dynamic Timeframe Analytics**: Interactive latency and uptime charts supporting 1h, 24h, 7d, and 30d rolling windows.

---

## Architecture Summary

- **Database (PostgreSQL)**: 9 tables:
  - `users`: Registered users and temporary guest rows (`is_guest = true`).
  - `monitors`: Target URLs, check intervals, and optional public report tokens.
  - `health_checks`: Discrete execution logs (status code, latency, error summary).
  - `incidents`: Open and resolved outage tracking.
  - `problem_reports`: Visitor issue submissions with triage statuses.
  - `user_sessions`: PostgreSQL session store (`connect-pg-simple`).
  - `ssl_checks`: TLS certificate inspection history and validity tracking.
  - `alert_contacts`: Discord webhook destinations with notification preferences.
  - `alert_logs`: Audit trail for alert deliveries and cooldown enforcement.
- **Database Logic**:
  - `trg_health_checks_incident_lifecycle`: `AFTER INSERT` trigger on `health_checks` managing the incident lifecycle.
  - `trg_monitors_guest_limit`: `BEFORE INSERT` trigger enforcing max 2 monitors for guests with SQLSTATE `GL001`.
  - Views:
    - `v_monitor_status`: LATERAL join combining latest check, open incident, 15m report clusters, and SSL status.
    - `v_incident_details`: Computes incident duration and failed checks via LATERAL join.
    - `v_monitor_ssl_status`: Extracts the latest SSL certificate inspection per monitor.
  - SQL Function: `fn_monitor_uptime_summary(monitor_id, from, to)` computing exact uptime percentage and latency stats.
  - Stored Procedure: `sp_purge_old_checks(days)` for data retention.
- **Backend**: Node.js, Express, TypeScript, Drizzle ORM, Argon2id/bcrypt, in-process scheduler with concurrency cap (5 max concurrent checks), SSRF protection with custom DNS resolution, Discord webhook dispatcher.
- **Frontend**: React (SPA), Vite, Tailwind CSS, React Router, Recharts for latency and uptime visualization, Framer Motion, GSAP.

---

## Getting Started

### 1. Database Setup
Create the role and database in PostgreSQL:
```sql
CREATE ROLE pulse WITH LOGIN PASSWORD 'pulse_dev_password';
CREATE DATABASE pulse OWNER pulse;
CREATE DATABASE pulse_test OWNER pulse;
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env to set your database credentials if different
npm run db:migrate   # Applies 0000_init_tables through 0004_ssl_and_discord_alerts
npm run db:seed      # Seeds demo users, monitors, and historical health checks
npm run dev          # API server on http://localhost:4000
```

### 3. Demo Target Server (Outage Simulator)
In a separate terminal:
```bash
cd backend
npm run demo:target  # Runs on http://localhost:4100
```

### 4. Frontend Setup
In a third terminal:
```bash
cd frontend
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

---

## Seed Accounts
- **Demo User**: `demo@pulse.test` / `password123!` (owns 5 monitors, historical outages, SSL checks)
- **Second User**: `other@pulse.test` / `password123!` (used to verify isolation)

---

## Everyday Commands
| Task | Command |
|---|---|
| Run backend development server | `cd backend && npm run dev` |
| Run demo target simulator | `cd backend && npm run demo:target` |
| Run frontend development server | `cd frontend && npm run dev` |
| Run automated backend tests | `cd backend && npm test` |
| Build frontend for production | `cd frontend && npm run build` |
| Reset & re-seed database | `cd backend && npm run db:reset && npm run db:seed` |
| Dump database submission SQL | `cd backend && npm run db:dump` |

---

## Documentation & Demonstration
- [docs/architecture.md](architecture.md): Complete system architecture, 3NF normalization, ER diagram, security, and query catalogue.
- [docs/api.md](docs/api.md): REST API endpoints, query schemas, and error codes.
- [docs/demo-script.md](docs/demo-script.md): 14-step viva and lab demonstration presentation flow.
