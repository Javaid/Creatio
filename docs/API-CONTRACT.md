# API Contract

This is the stable integration surface Creatio consumes. Everything under
`src/controllers`, `src/routes`, and `src/webhooks/outbound` must conform to
this document. Breaking changes require a version bump (`/api/v2/...`).

Status: **draft — no code implemented yet.** This defines the contract the
implementation phase will build against.

## 1. Conventions

- Base path: `/api/v1`
- Format: JSON, `Content-Type: application/json; charset=utf-8`
- Auth: `Authorization: Bearer <token>` (see `SECURITY.md` for issuance).
  Every request from Creatio must carry a valid token issued to a
  registered API client.
- Pagination: cursor-based, via `?cursor=<opaque>&limit=<n>` (default
  `limit=50`, max `200`). Responses include `nextCursor: string|null`.
- Timestamps: ISO-8601 UTC (`2026-01-15T10:30:00Z`).
- IDs: the service's own surrogate keys are UUIDs (`id`). The originating
  Jira key/ID is always also present (`jiraId`, `jiraKey`) so Creatio can
  correlate without depending on our internal ID scheme.
- Errors: uniform envelope —
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "field 'projectKey' is required",
      "details": []
    }
  }
  ```
- Standard HTTP status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422,
  429, 500, 502 (upstream Jira failure), 503 (sync temporarily unavailable).

## 2. Resource endpoints (read model, for Creatio to pull)

All list endpoints support `?updatedSince=<ISO8601>` in addition to cursor
pagination, so Creatio can do its own incremental pulls if it prefers a pull
model over webhooks.

| Resource | Endpoints |
|---|---|
| Projects | `GET /projects`, `GET /projects/:id` |
| Issue Types | `GET /issue-types`, `GET /issue-types/:id` |
| Statuses | `GET /statuses`, `GET /statuses/:id` |
| Priorities | `GET /priorities`, `GET /priorities/:id` |
| Users | `GET /users`, `GET /users/:id` |
| Sprints | `GET /projects/:projectId/sprints`, `GET /sprints/:id` |
| Customers/Accounts | `GET /customers`, `GET /customers/:id` |
| Issues | `GET /issues`, `GET /issues/:id`, `GET /issues/:id/changelog` |
| Worklogs | `GET /issues/:id/worklogs`, `GET /worklogs?updatedSince=...` |
| Sync history | `GET /sync/history`, `GET /sync/history/:id` |
| Sync checkpoints | `GET /sync/checkpoints` (read-only status view) |

Example — `GET /api/v1/issues/:id`:

```json
{
  "id": "6f1c1e2a-...-uuid",
  "jiraId": "10023",
  "jiraKey": "PROJ-123",
  "projectId": "3f2b...-uuid",
  "issueTypeId": "b1aa...-uuid",
  "statusId": "d4ee...-uuid",
  "priorityId": "a001...-uuid",
  "summary": "Fix login timeout",
  "description": "...",
  "assigneeId": "u-uuid-or-null",
  "reporterId": "u-uuid",
  "sprintId": "s-uuid-or-null",
  "customerId": "c-uuid-or-null",
  "storyPoints": 5,
  "createdAt": "2026-01-01T09:00:00Z",
  "updatedAt": "2026-01-10T14:22:00Z",
  "jiraCreatedAt": "2026-01-01T08:58:00Z",
  "jiraUpdatedAt": "2026-01-10T14:20:00Z",
  "syncedAt": "2026-01-10T14:22:05Z"
}
```

## 3. Sync control endpoints (admin/operational)

Restricted to an `admin` scope on the API client.

| Method | Path | Purpose |
|---|---|---|
| POST | `/sync/full` | Trigger a full sync (optionally scoped to `projectKeys[]`). Returns `202` with a `syncRunId`. |
| POST | `/sync/incremental` | Trigger an out-of-schedule incremental sync. Returns `202` with `syncRunId`. |
| GET | `/sync/runs/:syncRunId` | Poll status of a triggered run: `pending\|running\|completed\|failed`, counts. |
| GET | `/sync/errors` | List unresolved sync errors (paginated). |
| POST | `/sync/errors/:id/retry` | Force-retry a specific dead-lettered item. |

## 4. Webhook subscription management (Creatio registers itself)

| Method | Path | Purpose |
|---|---|---|
| POST | `/webhooks/subscriptions` | Register a Creatio endpoint for given `eventTypes[]`. Returns subscription `id` and a `secret` (shown once) for HMAC verification. |
| GET | `/webhooks/subscriptions` | List this client's subscriptions. |
| DELETE | `/webhooks/subscriptions/:id` | Remove a subscription. |
| GET | `/webhooks/deliveries?subscriptionId=` | Delivery log for troubleshooting (status, attempts, last error). |

Request body for registration:

```json
{
  "targetUrl": "https://creatio.local/api/webhooks/jira-sync",
  "eventTypes": ["issue.created", "issue.updated", "worklog.created"],
  "description": "Creatio production webhook receiver"
}
```

## 5. Outbound webhook payload (service → Creatio)

Delivered as `POST <targetUrl>`, signed with header
`X-Signature: sha256=<hex hmac>` computed over the raw body using the
subscription's `secret` (see `SECURITY.md` §4). Creatio verifies the
signature before trusting the payload — this is the only integrity
guarantee across the boundary, since the service does not manage Creatio's
inbound auth.

```json
{
  "eventId": "8f3e...-uuid",
  "eventType": "issue.updated",
  "occurredAt": "2026-01-10T14:22:05Z",
  "entity": {
    "type": "issue",
    "id": "6f1c1e2a-...-uuid",
    "jiraKey": "PROJ-123"
  },
  "data": { "...": "full normalized entity, same shape as the GET response" }
}
```

Event types (initial set): `project.created|updated`, `issue.created|updated|deleted`,
`worklog.created|updated|deleted`, `sprint.created|updated|closed`,
`issue.changelog.appended`.

Delivery semantics: **at-least-once**. Creatio's receiver must be
idempotent, keyed on `eventId` or on `(entity.type, entity.id, data.updatedAt)`.

## 6. Health & meta

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Liveness (no auth). |
| GET | `/readyz` | Readiness — checks DB connectivity and Jira reachability (no auth, minimal detail). |
| GET | `/api/v1/meta` | Service version, supported entity types, API version (auth required). |

## 7. Versioning & deprecation policy

- Additive changes (new optional fields, new endpoints) do not bump version.
- Breaking changes (field removal/rename, semantic change) require `/api/v2`
  and a documented deprecation window for `/api/v1`, tracked in
  `PROGRESS.md`.
