# Pulse REST API Specification

Base Path: `/api`  
Format: JSON in and out  
Authentication: HTTP-only session cookie (`pulse.sid`)  

## Error Format
All errors return the standard schema:
```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable error description",
    "details": []
  }
}
```

### Standard Error Codes
| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Body or query failed Zod validation |
| `URL_NOT_ALLOWED` | 422 | URL blocked by SSRF policy |
| `UNAUTHENTICATED` | 401 | Missing or invalid session |
| `INVALID_CREDENTIALS` | 401 | Incorrect email or password |
| `NOT_FOUND` | 404 | Resource not found or owned by another user |
| `EMAIL_TAKEN` | 409 | Email is already registered |
| `DUPLICATE_URL` | 409 | User already monitors this URL |
| `GUEST_LIMIT_REACHED` | 403 | Guest tier monitor limit reached (maximum 2) |
| `RATE_LIMITED` | 429 | Rate limit exceeded |

---

## 1. Authentication & Account
| Endpoint | Method | Auth | Body | Description |
|---|---|---|---|---|
| `/auth/register` | POST | None / Guest | `{ email, password, displayName }` | Register or upgrade guest in place |
| `/auth/login` | POST | None | `{ email, password }` | Log in |
| `/auth/logout` | POST | Session | None | Log out |
| `/auth/guest` | POST | None | None | Start guest session |
| `/auth/me` | GET | Session | None | Return current user details (`monitorLimit: 2` for guests) |
| `/account` | PATCH | Registered | `{ displayName }` | Update profile |
| `/account/password` | POST | Registered | `{ currentPassword, newPassword }` | Change password |
| `/account` | DELETE | Session | `{ password? }` | Delete account and cascade |

---

## 2. Monitors
All monitor endpoints are scoped to the authenticated owner.

| Endpoint | Method | Query / Body | Description |
|---|---|---|---|
| `GET /monitors` | GET | `?search=&status=up\|down\|unknown&page=1&pageSize=20` | List monitors with latest check, SSL, and open incident |
| `POST /monitors` | POST | `{ name, url, checkIntervalSeconds? }` | Create monitor (enforces guest limit trigger) |
| `GET /monitors/:id` | GET | None | Get single monitor & active open incident |
| `PATCH /monitors/:id` | PATCH | `{ name?, url?, checkIntervalSeconds? }` | Update monitor settings |
| `DELETE /monitors/:id` | DELETE | None | Delete monitor and cascade |
| `POST /monitors/:id/check` | POST | None | Execute manual health check immediately (rate-limited) |
| `GET /monitors/:id/history` | GET | `?result=up\|down&from=&to=&page=1&pageSize=20` | Paginated health checks history |
| `GET /monitors/:id/summary` | GET | `?range=1h\|24h\|7d\|30d` | Uptime % and response time statistics (`fn_monitor_uptime_summary`) |
| `GET /monitors/:id/response-times`| GET | `?range=1h\|24h\|7d\|30d` | Time-bucketed response time & uptime points for charts |
| `POST /monitors/:id/report-link` | POST | None | Generate or rotate public problem report link |
| `DELETE /monitors/:id/report-link` | DELETE | None | Disable public problem report link |

---

## 3. Incidents
| Endpoint | Method | Query | Description |
|---|---|---|---|
| `GET /incidents` | GET | `?status=open\|resolved&monitorId=&page=1&pageSize=20` | List incidents from `v_incident_details` |

---

## 4. Problem Reports (Authenticated Owner Triage)
| Endpoint | Method | Body | Description |
|---|---|---|---|
| `GET /problem-reports` | GET | `?status=new\|acknowledged\|resolved\|dismissed&page=1` | List problem reports received across owner's monitors |
| `PATCH /problem-reports/:id` | PATCH | `{ status: "acknowledged" \| "resolved" \| "dismissed" }` | Triage problem report |

---

## 5. Public Problem Reports (Unauthenticated)
| Endpoint | Method | Body | Description |
|---|---|---|---|
| `GET /public/report/:token` | GET | None | Returns `{ monitorName, status }` (safe public payload) |
| `POST /public/report/:token` | POST | `{ category, description, contactEmail?, website? }` | Submit problem report (`website` is honeypot) |

---

## 6. Dashboard & Health
| Endpoint | Method | Description |
|---|---|---|
| `GET /dashboard` | GET | Aggregated totals, 24h summary metrics, top monitors, and recent activity |
| `GET /health` | GET | Liveness probe and database connection round trip |

---

## 7. TLS / SSL Certificate Tracking
Inspects remote SSL/TLS certificates and tracks expiration countdowns.

| Endpoint | Method | Query / Body | Description |
|---|---|---|---|
| `GET /monitors/:id/ssl` | GET | None | Get latest SSL certificate check details for monitor |
| `POST /monitors/:id/ssl/check` | POST | None | Trigger an immediate live TLS inspection |

### Response Example (`GET /monitors/:id/ssl`)
```json
{
  "sslCheck": {
    "id": 42,
    "monitorId": 5,
    "checkedAt": "2026-10-25T19:30:00.000Z",
    "isValid": true,
    "issuer": "Let's Encrypt",
    "subject": "api.example.com",
    "validFrom": "2026-09-01T00:00:00.000Z",
    "validTo": "2026-11-30T23:59:59.000Z",
    "daysRemaining": 36,
    "protocol": "TLSv1.3",
    "errorMessage": null
  }
}
```

---

## 8. Alert Contacts & Discord Notifications
Manage notification channels for incident triggers and SSL expiry warnings.

| Endpoint | Method | Body | Description |
|---|---|---|---|
| `GET /alerts/contacts` | GET | None | List user's configured alert destinations |
| `POST /alerts/contacts` | POST | `{ name, webhookUrl, cooldownMinutes?, notifyOnDown?, notifyOnRecovery?, notifyOnSslExpiry? }` | Create Discord alert webhook |
| `GET /alerts/contacts/:id` | GET | None | Get single alert contact |
| `PATCH /alerts/contacts/:id` | PATCH | `{ name?, webhookUrl?, isActive?, cooldownMinutes?, notifyOnDown?, notifyOnRecovery?, notifyOnSslExpiry? }` | Update alert contact |
| `DELETE /alerts/contacts/:id` | DELETE | None | Remove alert contact |
| `POST /alerts/contacts/:id/test` | POST | None | Send a live test embed to the Discord webhook |
| `GET /alerts/logs` | GET | `?monitorId=&page=1&pageSize=20` | Audit trail of sent alerts and delivery statuses |
