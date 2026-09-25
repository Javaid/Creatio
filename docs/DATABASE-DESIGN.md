# Database Design

This is the service's **own** Microsoft SQL Server database — a separate
catalog from Creatio's database. Nothing here depends on, or is depended on
by, Creatio's schema. Access is via Sequelize models (`src/models`) and
`src/repositories`, using parameterized queries for anything Sequelize
doesn't express cleanly.

Naming convention: `snake_case` table/column names, singular-noun-free
plural table names, surrogate UUID primary keys (`id`) plus the natural
Jira key/ID kept as a unique column for correlation and idempotent upserts.

## 1. Domain tables (normalized Jira data)

### `jira_projects`
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| jira_id | NVARCHAR(64) | Jira internal project ID |
| jira_key | NVARCHAR(64) UNIQUE | e.g. `PROJ` |
| name | NVARCHAR(255) | |
| project_type | NVARCHAR(64) | software/service_desk/business |
| lead_jira_account_id | NVARCHAR(128) | FK by natural key to `jira_users.jira_account_id` |
| is_active | BIT | soft-disable for sync scoping |
| raw_payload | NVARCHAR(MAX) | last raw Jira JSON (audit/debug) |
| jira_created_at, jira_updated_at | DATETIME2 | |
| created_at, updated_at | DATETIME2 | service-side audit timestamps |

### `jira_issue_types`, `jira_statuses`, `jira_priorities`
Same shape (lookup tables): `id`, `jira_id`, `name`, `description`,
`icon_url`, `is_active`, `created_at`, `updated_at`. Statuses additionally
carry `status_category` (`to_do|in_progress|done`) since that drives a lot
of downstream reporting logic in Creatio.

### `jira_users`
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| jira_account_id | NVARCHAR(128) UNIQUE | Jira Cloud `accountId` (or `key` for Server/DC) |
| display_name | NVARCHAR(255) | |
| email | NVARCHAR(255) NULL | may be hidden by Jira privacy settings |
| active | BIT | |
| avatar_url | NVARCHAR(512) NULL | |
| jira_updated_at | DATETIME2 NULL | Jira doesn't always version users; nullable |
| created_at, updated_at | DATETIME2 | |

### `jira_sprints`
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| jira_id | NVARCHAR(64) UNIQUE | |
| project_id | UNIQUEIDENTIFIER FK → jira_projects | |
| name | NVARCHAR(255) | |
| state | NVARCHAR(32) | future/active/closed |
| start_date, end_date, complete_date | DATETIME2 NULL | |
| goal | NVARCHAR(MAX) NULL | |
| created_at, updated_at | DATETIME2 | |

Only populated where a project uses a board with sprints (Jira Software).
Absent entirely for pure Jira Work Management / Service Management projects
— see `JIRA-MAPPING.md` §"Availability by product".

### `jira_customers`
Represents Jira Service Management "Organizations" where available.
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| jira_id | NVARCHAR(64) UNIQUE | |
| name | NVARCHAR(255) | |
| created_at, updated_at | DATETIME2 | |

### `jira_issues`
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| jira_id | NVARCHAR(64) UNIQUE | |
| jira_key | NVARCHAR(64) UNIQUE | e.g. `PROJ-123`, mutable in Jira on project rekey — treated as a synced attribute, not a stable key |
| project_id | UNIQUEIDENTIFIER FK → jira_projects | |
| issue_type_id | UNIQUEIDENTIFIER FK → jira_issue_types | |
| status_id | UNIQUEIDENTIFIER FK → jira_statuses | |
| priority_id | UNIQUEIDENTIFIER FK NULL → jira_priorities | |
| summary | NVARCHAR(512) | |
| description | NVARCHAR(MAX) NULL | |
| assignee_id | UNIQUEIDENTIFIER FK NULL → jira_users | |
| reporter_id | UNIQUEIDENTIFIER FK NULL → jira_users | |
| sprint_id | UNIQUEIDENTIFIER FK NULL → jira_sprints | |
| customer_id | UNIQUEIDENTIFIER FK NULL → jira_customers | |
| parent_issue_id | UNIQUEIDENTIFIER FK NULL → jira_issues | subtasks |
| story_points | FLOAT NULL | |
| labels | NVARCHAR(MAX) NULL | JSON array, stored as text (see §5) |
| raw_payload | NVARCHAR(MAX) | last raw Jira JSON |
| jira_created_at, jira_updated_at | DATETIME2 | |
| created_at, updated_at | DATETIME2 | |

Indexes: unique on `jira_id`; index on `jira_key`; index on
`(project_id, jira_updated_at)` for incremental scans; index on `status_id`.

### `jira_worklogs`
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| jira_id | NVARCHAR(64) UNIQUE | |
| issue_id | UNIQUEIDENTIFIER FK → jira_issues | |
| author_id | UNIQUEIDENTIFIER FK NULL → jira_users | |
| time_spent_seconds | INT | |
| started_at | DATETIME2 | |
| comment | NVARCHAR(MAX) NULL | |
| jira_created_at, jira_updated_at | DATETIME2 | |
| created_at, updated_at | DATETIME2 | |

### `jira_issue_changelog`
Append-only status/field history.
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| jira_history_id | NVARCHAR(64) UNIQUE | Jira changelog entry ID |
| issue_id | UNIQUEIDENTIFIER FK → jira_issues | |
| field_name | NVARCHAR(128) | e.g. `status`, `assignee` |
| from_value, to_value | NVARCHAR(512) NULL | |
| author_id | UNIQUEIDENTIFIER FK NULL → jira_users | |
| changed_at | DATETIME2 | |
| created_at | DATETIME2 | |

## 2. Sync infrastructure tables

### `sync_checkpoints`
One row per entity type (+ optional project scope), tracking the resume
point for incremental sync.
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| entity_type | NVARCHAR(64) | `project\|issue\|user\|worklog\|sprint\|...` |
| scope_key | NVARCHAR(128) NULL | e.g. project key, null = global |
| last_synced_at | DATETIME2 | watermark used as `updated >= last_synced_at` for the next run |
| last_cursor | NVARCHAR(256) NULL | opaque pagination token if the endpoint uses one |
| updated_at | DATETIME2 | |

Unique constraint on `(entity_type, scope_key)`.

### `sync_history`
One row per sync run (full or incremental), for audit/observability and
for `GET /sync/history`.
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | (this is the `syncRunId` in the API) |
| sync_type | NVARCHAR(16) | `full\|incremental\|webhook` |
| triggered_by | NVARCHAR(32) | `schedule\|api\|webhook` |
| status | NVARCHAR(16) | `pending\|running\|completed\|failed` |
| entity_types | NVARCHAR(256) | comma list of entity types included |
| started_at, finished_at | DATETIME2 NULL | |
| records_fetched, records_created, records_updated, records_failed | INT | |
| error_summary | NVARCHAR(MAX) NULL | |

### `sync_errors`
Per-item failure/retry queue (not a full run failure — one bad issue
shouldn't fail the run).
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| sync_run_id | UNIQUEIDENTIFIER FK NULL → sync_history | |
| entity_type | NVARCHAR(64) | |
| entity_jira_id | NVARCHAR(64) | |
| error_message | NVARCHAR(MAX) | |
| attempt_count | INT DEFAULT 0 | |
| next_retry_at | DATETIME2 NULL | |
| status | NVARCHAR(16) | `pending\|retrying\|resolved\|dead_letter` |
| created_at, updated_at | DATETIME2 | |

## 3. Integration/security tables

### `api_clients`
Represents Creatio (or any consumer) authorized to call this service.
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| client_name | NVARCHAR(128) | e.g. "Creatio Production" |
| api_key_hash | NVARCHAR(256) | hashed, never stored plaintext |
| scopes | NVARCHAR(256) | comma list: `read\|admin\|webhook_manage` |
| is_active | BIT | |
| created_at, updated_at, last_used_at | DATETIME2 | |

### `webhook_subscriptions`
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| api_client_id | UNIQUEIDENTIFIER FK → api_clients | |
| target_url | NVARCHAR(1024) | |
| event_types | NVARCHAR(512) | comma list |
| secret_hash | NVARCHAR(256) | HMAC secret, hashed at rest; plaintext shown once at creation |
| is_active | BIT | |
| created_at, updated_at | DATETIME2 | |

### `outbound_webhook_deliveries`
| Column | Type | Notes |
|---|---|---|
| id | UNIQUEIDENTIFIER PK | |
| subscription_id | UNIQUEIDENTIFIER FK → webhook_subscriptions | |
| event_id | UNIQUEIDENTIFIER | correlates to the delivered payload's `eventId` |
| event_type | NVARCHAR(64) | |
| payload | NVARCHAR(MAX) | |
| attempt_count | INT DEFAULT 0 | |
| status | NVARCHAR(16) | `pending\|delivered\|failed\|dead_letter` |
| last_attempted_at | DATETIME2 NULL | |
| last_error | NVARCHAR(MAX) NULL | |
| created_at | DATETIME2 | |

## 4. Duplicate prevention strategy

- Every Jira-sourced table has a **unique constraint on the Jira natural
  key** (`jira_id`, or `jira_history_id`/`jira_account_id` where that's the
  natural key). All writes go through `INSERT ... ON CONFLICT`-equivalent
  upsert logic (`MERGE` statement or Sequelize `upsert`) keyed on that
  column — never a blind insert.
- `jira_key` (human-readable, e.g. `PROJ-123`) is **not** used as a
  uniqueness key for issues because Jira allows project re-keying, which
  changes issue keys but not IDs. `jira_id` is the durable identity;
  `jira_key` is a synced, mutable attribute.
- Changelog entries are immutable in Jira, so `jira_history_id` uniqueness
  alone is sufficient — no update path needed, only insert-if-absent.

## 5. SQL Server-specific notes

- JSON-shaped columns (`labels`, `raw_payload`) are stored as `NVARCHAR(MAX)`
  and accessed with SQL Server's native `JSON_VALUE`/`OPENJSON` where
  querying into them is needed, rather than a dedicated JSON column type
  (SQL Server has no native JSON type as of 2022/2025 editions).
- All primary keys are `UNIQUEIDENTIFIER` with `DEFAULT NEWSEQUENTIALID()`
  to reduce clustered-index fragmentation versus `NEWID()`.
- Migrations are managed through Sequelize CLI migrations
  (`src/models/migrations`), never manual schema edits against the target
  server — this keeps schema changes reproducible across dev/UAT/prod.
- Connection uses the `mssql` dialect (via `tedious` driver) with connection
  pooling sized from `config/database.js`, encrypted connections
  (`encrypt: true`) since this is a production deployment.

## 6. What's deliberately excluded

- No foreign key *into* any Creatio table — impossible by construction,
  since this database has no visibility into Creatio's schema at all.
- No triggers or cross-database queries. This database is self-contained.
