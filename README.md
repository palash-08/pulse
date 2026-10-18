# Pulse

> The heartbeat of your infrastructure.
> DBMS Laboratory (24CS305/CS3106) Group Mini Project.

Pulse is a lightweight uptime monitoring and response-time tracking platform. It uses PostgreSQL as its core engine to manage incident lifecycles, enforce guest limits, compute statistics without drift, and handle data retention.

---

## Architecture Summary
- **Database (PostgreSQL)**: 6 tables (`users`, `monitors`, `health_checks`, `incidents`, `problem_reports`, `user_sessions`).
- **Database Logic**:
  - `trg_health_checks_incident_lifecycle`: AFTER INSERT trigger on `health_checks` that automatically opens an incident on failure (with partial unique index race prevention) and resolves it on recovery.
  - `trg_monitors_guest_limit`: BEFORE INSERT trigger enforcing maximum 2 monitors for guests with SQLSTATE `GL001`.
  - Views: `v_monitor_status` (LATERAL join for latest check and 15m reports) and `v_incident_details`.
  - SQL Function: `fn_monitor_uptime_summary(monitor_id, from, to)` computing exact uptime percentage and latency stats.
  - Stored Procedure: `sp_purge_old_checks(days)` for data retention.
- **Backend**: Node.js, Express, TypeScript, Drizzle ORM, Argon2id/bcrypt, in-process scheduler with concurrency cap (5 max concurrent checks), SSRF protection with custom DNS resolution.
- **Frontend**: React (SPA), Vite, Tailwind CSS, React Router, Recharts for latency and uptime visualization.

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
npm run db:migrate   # Applies 0000_init_tables, 0001_views, 0002_functions_procedures, 0003_triggers
npm run db:seed      # Seeds 10 users, 14 monitors, and ~3,000 health checks
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
- **Demo User**: `demo@pulse.test` / `password123!` (owns 5 monitors, historical outages)
- **Second User**: `other@pulse.test` / `password123!` (used to verify isolation)

---

## Everyday Commands
| Task | Command |
|---|---|
| Run backend development server | `cd backend && npm run dev` |
| Run demo target simulator | `cd backend && npm run demo:target` |
| Run frontend development server | `cd frontend && npm run dev` |
| Run automated tests | `cd backend && npm test` |
| Reset & re-seed database | `cd backend && npm run db:reset && npm run db:seed` |
| Dump database submission SQL | `cd backend && npm run db:dump` |

---

## 11-Step Demonstration Script
See [docs/demo-script.md](docs/demo-script.md) for the exact step-by-step viva presentation flow.
