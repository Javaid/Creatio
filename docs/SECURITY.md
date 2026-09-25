# Security

## 1. Trust boundaries

```
Jira  ──(A)──▶  This service  ──(B)──▶  Creatio
Jira  ◀───────  This service  ◀──(C)──  Creatio
```

- **(A) Service → Jira**: outbound only, authenticated with a Jira API
  token/PAT. Jira is trusted as the source of truth for data, but its
  webhook deliveries (inbound to this service) are still verified (see §3).
- **(B) Service → Creatio (outbound webhooks)**: authenticated by HMAC
  signature so Creatio can trust payloads actually came from this service.
- **(C) Creatio → Service (REST calls)**: authenticated by bearer token
  issued to a registered API client.

Each arrow is independently secured — a compromise of one credential
(e.g. the Jira API token) does not expose the others.

## 2. Credentials & secrets management

| Secret | Stored as | Loaded via |
|---|---|---|
| Jira API token / PAT | Environment variable (`JIRA_API_TOKEN`), never committed | `config/jira.js` reads from `process.env`, validated at boot with Joi; process fails fast if missing |
| SQL Server credentials | Environment variables (`DB_USER`, `DB_PASSWORD`) or, on IIS, Windows Integrated Auth where feasible | `config/database.js` |
| API client keys (Creatio) | Hashed (bcrypt/argon2) in `api_clients.api_key_hash` — plaintext shown exactly once at creation time via an admin CLI/endpoint, never retrievable again | `middleware/auth.js` hashes the incoming header value and compares |
| Webhook HMAC secrets | Hashed at rest in `webhook_subscriptions.secret_hash`, plaintext returned once at registration | `webhooks/outbound` signs using the secret before it's hashed/stored, or re-derives via a keyed scheme — implementation detail to finalize in `PROGRESS.md` open decisions |

Rules:
- `.env` is git-ignored; `.env.example` documents required variables with
  placeholder values only.
- No secret is ever logged. `logging/` redacts known secret-shaped fields
  (`Authorization`, `apiKey`, `secret`, `password`, `token`) from log
  output by key-name pattern match.
- Secrets are never embedded in `raw_payload` snapshots or error messages
  persisted to `sync_errors`.

## 3. Inbound authentication

### 3a. Jira webhooks → this service

Jira Cloud webhooks can be configured with a shared secret (JWT for
Connect apps, or a simple shared-secret query param / header for classic
webhooks depending on Jira edition). This service validates that shared
secret on every inbound webhook request before processing, and rejects
(`401`) otherwise. IP allowlisting to Atlassian's published webhook IP
ranges is applied as defense-in-depth where the hosting network allows
egress/ingress filtering.

### 3b. Creatio → this service (REST API)

- `Authorization: Bearer <token>` header, matched against `api_clients`.
- Tokens are opaque random strings (not JWTs, since there's no need for
  client-side claim inspection) — validated by hash lookup, similar to a
  Stripe-style API key.
- Rate limiting per client (`middleware/rateLimit.js`, e.g.
  `express-rate-limit` backed by an in-memory or DB store) to blunt abuse
  or runaway Creatio retry loops.
- Scoped permissions: `read` (GET endpoints), `admin` (sync trigger,
  error retry), `webhook_manage` (subscription CRUD) — enforced per-route
  in `middleware/authorize.js`.

## 4. Outbound webhook signing (this service → Creatio)

Every outbound delivery includes:

```
X-Signature: sha256=<hex(hmac_sha256(secret, rawRequestBody))>
X-Event-Id: <uuid>
X-Delivery-Timestamp: <ISO8601>
```

Creatio's receiver recomputes the HMAC over the raw body using its stored
secret and performs a constant-time comparison. `X-Delivery-Timestamp` lets
the receiver reject stale replays (e.g. older than 5 minutes) as
additional replay protection.

## 5. Transport security

- All external HTTP (to Jira, to Creatio, from Creatio) is HTTPS/TLS only.
  No plaintext HTTP endpoint is exposed in production configuration.
- SQL Server connection uses `encrypt: true` (TLS to the DB).
- Under IIS, TLS termination is typically at the IIS site binding /
  reverse proxy (e.g. Application Request Routing or a front-end load
  balancer) — `DEPLOYMENT.md` documents the expected binding.

## 6. Input validation

- Every request body, query param, and path param on every route is
  validated with a Joi schema in `validators/` before reaching a
  controller. Unknown fields are stripped (`stripUnknown: true`) rather
  than silently accepted.
- Inbound Jira webhook payloads are schema-validated defensively (Jira is
  a trusted but external system; malformed/unexpected payloads must not
  crash the process — they're logged and rejected with `400`).

## 7. Data protection

- No Jira data classified as sensitive beyond normal business data is
  expected (this is issue-tracking metadata, not PII-heavy by nature), but
  `jira_users.email` is treated as personal data: excluded from log output,
  and access to `/users` endpoints requires the same `read` scope as
  everything else (no separate public exposure).
- `raw_payload` columns retain full Jira JSON for audit/debug — access to
  these is not exposed via the public API surface at all (internal-only,
  queried directly against the DB by operators if ever needed).

## 8. Least privilege

- The SQL Server login used by this service has permissions scoped to its
  own database only (`db_datareader`/`db_datawriter` + `EXECUTE` on its own
  stored procs if any) — explicitly no access to any Creatio database that
  might live on the same SQL Server instance.
- The Jira API token/PAT is provisioned with the minimum project/read
  scopes needed (read access to the configured projects; write access only
  if/when a future phase adds Creatio-to-Jira write-back, which is out of
  scope today per `ARCHITECTURE.md` §8).

## 9. Auditability

- `sync_history` and `sync_errors` provide an audit trail of what was
  synced and what failed.
- `outbound_webhook_deliveries` provides an audit trail of what was sent to
  Creatio and delivery outcomes.
- Structured logs include a correlation/request ID per inbound HTTP
  request and per sync run, so a support engineer can trace one Jira issue
  update end-to-end through logs.

## 10. Open items

Tracked in `PROGRESS.md` under unresolved decisions: final choice of Jira
Cloud webhook auth mechanism (JWT vs. shared secret, depends on whether a
Connect/Forge app or a plain webhook is used), and whether API client
tokens should eventually move to short-lived JWTs with refresh instead of
long-lived opaque keys.
