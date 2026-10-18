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
| `/auth/me` | GET | Session | None | Return current user details |
| `/account` | PATCH | Registered | `{ displayName }` | Update profile |
| `/account/password` | POST | Registered | `{ currentPassword, newPassword }` | Change password |
| `/account` | DELETE | Session | `{ password? }` | Delete account and cascade |

---

## 2. Monitors
All monitor endpoints are scoped to the authenticated owner.

| Endpoint | Method | Description |
|---|---|---|
| `GET /monitors` | GET | List monitors (search, status filter, paging) |
| `POST /monitors` | POST | Create monitor (`{ name, url, checkIntervalSeconds? }`) |
| `GET /monitors/:id` | GET | Get single monitor & active open incident |
| `PATCH /monitors/:id` | PATCH | Update monitor settings |
| `DELETE /monitors/:id` | DELETE | Delete monitor and all checks |
| `POST /monitors/:id/check` | POST | Execute manual health check immediately |
| `GET /monitors/:id/history` | GET | Paginated health checks history |
| `GET /monitors/:id/summary` | GET | Uptime % and response time statistics (`24h`, `7d`, `30d`) |
| `GET /monitors/:id/response-times`| GET | Time-bucketed response time & uptime points for charts |
| `POST /monitors/:id/report-link` | POST | Generate/rotate public problem report link |
| `DELETE /monitors/:id/report-link` | DELETE | Disable public problem report link |

---

## 3. Incidents
| Endpoint | Method | Description |
|---|---|---|
| `GET /incidents` | GET | List incidents from `v_incident_details` (status filter, paging) |

---

## 4. Problem Reports (Authenticated Owner Triage)
| Endpoint | Method | Description |
|---|---|---|
| `GET /problem-reports` | GET | List problem reports received across owner's monitors |
| `PATCH /problem-reports/:id` | PATCH | Update report status (`acknowledged`, `resolved`, `dismissed`) |

---

## 5. Public Problem Reports (Unauthenticated)
| Endpoint | Method | Description |
|---|---|---|
| `GET /public/report/:token` | GET | Returns `{ monitorName, status }` (no private details leaked) |
| `POST /public/report/:token` | POST | Submit report (`{ category, description, contactEmail?, website? }`) |

---

## 6. Dashboard & Health
| Endpoint | Method | Description |
|---|---|---|
| `GET /dashboard` | GET | Aggregated totals, 24h summary, top monitors, and recent checks |
| `GET /health` | GET | Liveness probe and database connection round trip |
