# Pulse: 11-Step Lab Demonstration Script

This reproducible script demonstrates all core requirements and DBMS showcase features of **Pulse** using the local demo target on port 4100.

---

### Prerequisites
1. PostgreSQL running locally with database `pulse`
2. Backend API running: `cd backend && npm run dev` (Port 4000)
3. Demo target running: `cd backend && npm run demo:target` (Port 4100)
4. Frontend running: `cd frontend && npm run dev` (Port 5173)

---

### Step-by-Step Viva Demo

| Step | Action | Expected Result | Evidence to Show |
|---|---|---|---|
| **1** | Open `http://localhost:5173/login`, click **Continue as Guest** | Lands on Dashboard with amber Guest Banner; `GET /api/auth/me` returns `isGuest: true`, `monitorLimit: 2` | Browser DevTools Network tab & session cookie `pulse.sid` |
| **2** | Navigate to **Monitors -> Add Monitor**, add `"Shop API"` pointing to `http://localhost:4100/svc/shop-api` | Monitor appears in list with status `unknown` and `"Simulated Target"` badge | `SELECT * FROM monitors WHERE name = 'Shop API';` in `psql` |
| **3** | Click **Run check** on `"Shop API"` (demo target is `up`) | Status turns green `Up`, HTTP 200, response time shown | `SELECT * FROM health_checks WHERE monitor_id = ... ORDER BY checked_at DESC LIMIT 1;` |
| **4** | On demo target: set `shop-api` to `down` via `curl -X POST localhost:4100/control/shop-api -H "content-type: application/json" -d '{"mode":"down"}'`. Then click **Run check** twice in Pulse | First failure: Status `Down`, **Incident opens**. Second failure: **No duplicate incident** created | `SELECT * FROM incidents WHERE monitor_id = ... AND status = 'open';` (Shows exactly 1 row) |
| **5** | Set `shop-api` back to `up`: `curl -X POST localhost:4100/control/shop-api -H "content-type: application/json" -d '{"mode":"up"}'`. Click **Run check** | Status turns `Up`, **Incident automatically resolved** with `resolved_at` set | `SELECT * FROM v_incident_details;` shows duration and failed checks count |
| **6** | Open Monitor Detail page for `"Shop API"` | History table lists checks; Uptime summary shows % uptime; Recharts latency and uptime graphs render | `SELECT * FROM fn_monitor_uptime_summary(<id>, now() - interval '1 day', now());` |
| **7** | On Monitors page: search `"shop"` (matches Shop API) and test status filter (`All`, `Up`, `Down`) | Real-time filtering executes parameterized `v_monitor_status` query | DevTools Query query string & SQL parameterized logs |
| **8** | Inspect PostgreSQL objects in `psql` | Show triggers, views, function and stored procedure | `\dv` (views), `\df fn_*` (functions), `\df sp_*` (procedures), `\dft` (triggers) |
| **9** | While in Guest mode: add 2 more monitors (total 3) | Third monitor rejected with `403 GUEST_LIMIT_REACHED`; UI prompts to register | Trigger `GL001` error in API log |
| **10** | Log in as `other@pulse.test` (password: `password123!`), attempt to access demo user's monitor ID | Receives HTTP 404 (not 403, preventing resource enumeration) | Network tab 404 response |
| **11** | Enable public report link on Shop API, open in private window, submit 3 problem reports | Reports accepted with 201; Owner dashboard shows new reports badge; Shop API shows warning badge | `SELECT * FROM problem_reports;` and `recent_reports_15m` in `v_monitor_status` |
