# Architecture

## 1. Purpose

This service is a standalone **Jira-to-Creatio synchronization backend**. It
retrieves data from Jira, normalizes it into its own data model, persists it
in its own Microsoft SQL Server database, and exposes that data to Creatio
8.3.x (running on IIS) through a versioned REST API and outbound webhooks.

The service is a source-of-truth mirror of relevant Jira data, decoupled from
both systems it connects. It never assumes anything about Creatio's internal
schema, and it never assumes anything about how Creatio chooses to consume
the data beyond the published contract in `API-CONTRACT.md`.

## 2. Guiding constraints

These constraints are non-negotiable and drive every design decision below:

1. **Independence from Creatio.** The service has no compile-time or
   runtime dependency on Creatio packages, Creatio's database, or Creatio's
   configuration. It could be demoed and tested with zero Creatio instance
   running.
2. **Contract-based integration.** Creatio talks to this service only
   through the REST API and webhooks described in `API-CONTRACT.md` and
   `CREATIO-INTEGRATION.md`. Nothing about Creatio's internal object model
   leaks into this service's domain model.
3. **No direct DB access to/from Creatio.** This service never connects to
   Creatio's MSSQL database, never writes to Creatio-specific tables
   (`Case`, `Activity`, custom Creatio objects, etc.), and does not depend on
   Creatio's schema existing or being reachable. Any future write-back to
   Creatio happens exclusively through Creatio's own OData/REST endpoints,
   called from a clearly isolated module — never through shared SQL Server
   access.
4. **Own persistence.** The service owns a dedicated SQL Server database
   (separate catalog from Creatio's) that stores the normalized Jira domain
   model, sync checkpoints, sync history, and integration metadata (API
   clients, webhook subscriptions).
5. **Windows/IIS deployability.** The service must run under IIS via
   iisnode (or an equivalent Windows-hosted Node process). No Linux-only
   assumptions (no reliance on POSIX signals for orchestration, no PM2, no
   systemd units). Process lifecycle, stdout/stderr capture, and port
   binding follow the iisnode model (`web.config` + named pipes or dynamic
   ports).

## 3. High-level component diagram

```
                         ┌─────────────────────────────────────────┐
                         │              Jira (source)               │
                         │  REST API (Cloud v3 / Server & DC PAT)   │
                         │  Webhooks (issue/worklog/sprint events)  │
                         └───────────────┬───────────────────────────┘
                                         │ HTTPS (outbound poll + inbound webhook)
                                         ▼
        ┌────────────────────────────────────────────────────────────────┐
        │                    Jira Sync Service (this repo)                │
        │                                                                  │
        │  ┌───────────────┐   ┌───────────────┐   ┌────────────────────┐ │
        │  │ integrations/ │   │     sync/     │   │       jobs/         │ │
        │  │     jira      │──▶│  sync engine  │◀──│  scheduler (cron)   │ │
        │  │ (API client)  │   │ (full/incr.)  │   └────────────────────┘ │
        │  └───────────────┘   └───────┬───────┘                          │
        │                              ▼                                  │
        │                     ┌──────────────────┐                        │
        │                     │  repositories/   │                        │
        │                     │  (Sequelize/SQL) │                        │
        │                     └────────┬─────────┘                        │
        │                              ▼                                  │
        │                  ┌────────────────────────┐                     │
        │                  │  MS SQL Server (own DB) │                     │
        │                  └────────────────────────┘                     │
        │                                                                  │
        │  ┌───────────────┐   ┌───────────────┐   ┌────────────────────┐ │
        │  │  controllers/ │   │   webhooks/   │   │    middleware/      │ │
        │  │   + routes/   │   │  in + outbound│   │ auth, validation,   │ │
        │  │  (REST API)   │   │   dispatcher  │   │ error, rate-limit   │ │
        │  └───────┬───────┘   └───────┬───────┘   └────────────────────┘ │
        └──────────┼───────────────────┼──────────────────────────────────┘
                   │                   │
        REST calls │                   │ outbound webhook (HMAC signed)
                   ▼                   ▼
        ┌─────────────────────────────────────────┐
        │        Creatio 8.3.x (downstream)         │
        │  IIS-hosted, consumes via REST + webhooks │
        └─────────────────────────────────────────┘
```

## 4. Layered responsibilities

| Layer | Responsibility | Must NOT do |
|---|---|---|
| `integrations/jira` | Talk to Jira's REST API only. Auth, pagination, rate-limit backoff, raw response shaping. | Know anything about Creatio or the internal DB schema. |
| `sync/` | Orchestrate full and incremental sync runs, own checkpoint/cursor logic, decide create/update/skip, emit domain events. | Make raw HTTP calls to Jira directly, or format HTTP responses. |
| `repositories/` | All persistence access (Sequelize models or parameterized SQL) for the service's own schema. | Contain business/sync logic. |
| `models/` | Sequelize model definitions / DB schema mapping for the service's own tables. | Reference Creatio tables. |
| `controllers/` + `routes/` | Translate HTTP requests into service calls; shape HTTP responses per `API-CONTRACT.md`. | Contain sync logic or direct DB queries. |
| `webhooks/` | Receive Jira webhook events (inbound); sign and deliver outbound webhooks to Creatio-registered endpoints. | Perform full sync logic — inbound webhooks trigger/queue sync work, they don't reimplement it. |
| `jobs/` | Cron/scheduled triggers for scheduled sync and retry sweeps. | Contain business logic — jobs call into `sync/`. |
| `validators/` | Joi schemas for all inbound payloads (Creatio API calls, webhook registration, admin endpoints). | — |
| `middleware/` | Authentication (API key/JWT for Creatio), request logging, centralized error handling, rate limiting. | — |
| `logging/` | Structured logger configuration (correlation IDs, levels, transports). | — |
| `config/` | Environment-based configuration loading/validation (dotenv + schema). | Hardcode secrets or environment-specific values. |
| `utils/` | Small stateless helpers (date formatting, pagination helpers, retry/backoff utility). | Become a dumping ground for business logic. |

## 5. Data flow summary

1. **Inbound from Jira** happens two ways:
   - *Scheduled polling*: `jobs/` triggers `sync/` on a cron schedule, which
     uses `integrations/jira` to pull changed data since the last checkpoint
     (JQL `updated >= <checkpoint>` for issues; equivalent list+filter calls
     for other entities).
   - *Jira webhooks*: Jira pushes issue/worklog/sprint events to
     `webhooks/inbound`. The handler validates the payload, enqueues (or
     directly performs, for MVP) a targeted upsert through `sync/`, and
     returns fast (Jira webhooks expect low latency).
2. **Normalization**: `sync/` maps raw Jira JSON to the service's own domain
   shape (see `JIRA-MAPPING.md`) and calls `repositories/` to persist.
3. **Checkpointing**: after each successful sync unit (per entity type),
   `sync/` updates `sync_checkpoints` and appends a `sync_history` record.
4. **Outbound to Creatio**: on create/update/delete of a tracked entity,
   `sync/` emits a domain event. `webhooks/outbound` fans that event out to
   every Creatio-registered subscription matching the entity type, signing
   the payload (HMAC-SHA256) and retrying with backoff on failure.
5. **On-demand from Creatio**: Creatio may also just call the REST API
   directly (pull model) instead of relying solely on webhooks — both modes
   are supported so Creatio can choose push, pull, or both.

## 6. Error handling & resilience (high level; details in DATABASE-DESIGN.md)

- Every sync unit (single Jira entity fetch+persist) is wrapped so a failure
  on one item does not abort the batch.
- Failures are recorded in a `sync_errors` table with entity type, entity
  key, error message, attempt count, and next-retry timestamp.
- A scheduled job sweeps `sync_errors` and retries with exponential backoff
  up to a configurable max-attempts, after which the item is marked
  `dead_letter` for manual inspection via an admin endpoint.
- Outbound webhook deliveries follow the same retry/dead-letter pattern in
  `outbound_webhook_deliveries`.

## 7. Deployment shape

Single Node.js/Express process, hosted under IIS via iisnode. See
`DEPLOYMENT.md` for the full IIS/iisnode setup, `web.config`, and process
model. The scheduler (`jobs/`) runs in-process (no separate worker process,
no PM2) using `node-cron` or `node-schedule`, guarded by a DB-backed lock so
a second instance in an IIS web-garden scenario doesn't double-run jobs.

## 8. Non-goals (for this phase and generally)

- No UI. This is an API-only service.
- No direct Creatio DB writes, ever.
- No assumption of a single fixed Jira project — multi-project sync is
  supported by configuration.
- No message broker (Kafka/RabbitMQ) in the initial design — outbound
  webhook delivery and retry queues are DB-backed. This can be revisited if
  volume demands it (see `PROGRESS.md` unresolved decisions).
