# Jira Mapping

How raw Jira REST API responses map onto the service's normalized domain
model (`src/models`, tables in `DATABASE-DESIGN.md`). This is the reference
the `sync/` and `integrations/jira` modules implement against.

## 0. Jira platform assumptions

- Target is most commonly **Jira Cloud REST API v3** (`/rest/api/3/...`,
  `/rest/agile/1.0/...` for boards/sprints). The client in
  `integrations/jira` is written against Cloud v3 first.
- **Jira Server/Data Center** support (PAT-based auth, `/rest/api/2/...`)
  is a configuration-level concern (different base URL, different auth
  header, minor payload differences e.g. `accountId` vs `key`/`name` for
  users) isolated behind a single adapter interface so the rest of the
  service never branches on Jira flavor. See `CREATIO-INTEGRATION.md` is
  not relevant here — this isolation lives entirely in
  `integrations/jira/client.js` + a `server-adapter.js` /
  `cloud-adapter.js` pair, decided at config load time.
- Multi-project sync is supported; project scope is configuration
  (`JIRA_PROJECT_KEYS=PROJ1,PROJ2` or "all visible to the configured
  account").

## 1. Projects

Source: `GET /rest/api/3/project/search` (paginated) or
`GET /rest/api/3/project/{key}`.

| Jira field | Normalized field | Notes |
|---|---|---|
| `id` | `jira_id` | |
| `key` | `jira_key` | |
| `name` | `name` | |
| `projectTypeKey` | `project_type` | `software\|service_desk\|business` |
| `lead.accountId` | `lead_jira_account_id` | resolved to `jira_users` FK during upsert |
| (derived: not archived) | `is_active` | Jira project has no simple boolean; derive from `archived`/`deleted` fields where present |

## 2. Issue types, statuses, priorities

Source: `GET /rest/api/3/issuetype`, `GET /rest/api/3/status`,
`GET /rest/api/3/priority`. These are near pass-through:

| Jira field | Normalized field |
|---|---|
| `id` | `jira_id` |
| `name` | `name` |
| `description` | `description` |
| `iconUrl` | `icon_url` |
| `statusCategory.key` (statuses only) | `status_category` |

Statuses in Jira are technically scoped per workflow and can have
duplicate names across projects with different IDs — always key by `id`,
never by name.

## 3. Users

Source: `GET /rest/api/3/user/search` (bulk) or discovered opportunistically
from `accountId` references embedded in issues/worklogs/changelogs (Jira
Cloud does not provide a simple "list all users" for every permission
level).

| Jira field | Normalized field | Notes |
|---|---|---|
| `accountId` | `jira_account_id` | Cloud. On Server/DC, `key` (fallback `name`) plays this role. |
| `displayName` | `display_name` | |
| `emailAddress` | `email` | Often null — Jira Cloud hides this by default per user privacy settings; do not treat null as an error. |
| `active` | `active` | |
| `avatarUrls."48x48"` | `avatar_url` | |

**Strategy**: users are synced both proactively (bulk endpoint, if the
configured Jira API token has directory access) and lazily/upserted
whenever a new `accountId` is encountered while syncing issues, worklogs,
or changelog entries that the bulk sync missed (e.g. inactive/deleted
accounts still referenced historically).

## 4. Sprints

Source: `GET /rest/agile/1.0/board/{boardId}/sprint` for each board
associated with a synced project's board(s), discovered via
`GET /rest/agile/1.0/board?projectKeyOrId={key}`.

| Jira field | Normalized field |
|---|---|
| `id` | `jira_id` |
| `name` | `name` |
| `state` | `state` |
| `startDate` | `start_date` |
| `endDate` | `end_date` |
| `completeDate` | `complete_date` |
| `goal` | `goal` |
| `originBoardId` → resolved project | `project_id` |

### Availability by product

Sprints only exist for **Jira Software** (team-managed or company-managed
scrum/kanban boards with sprint enabled). Jira Work Management and Jira
Service Management projects have no sprint concept — `sync/` must skip
sprint sync for those project types without treating the absence as an
error (see `project_type` from §1).

## 5. Customers / Accounts

Source: Jira Service Management **Organizations** API
(`GET /rest/servicedeskapi/organization`), only relevant when the
configured Jira instance has JSM projects.

| Jira field | Normalized field |
|---|---|
| `id` | `jira_id` |
| `name` | `name` |

This is genuinely "where available" — most Jira Software-only instances
will have zero rows here, and `sync/` treats a 404/absent JSM license as
"feature not present," not a sync failure.

## 6. Issues

Source: `GET /rest/api/3/search` (JQL: `project in (...) AND updated >=
"<checkpoint>" ORDER BY updated ASC`), paginated via `startAt`/`maxResults`,
requesting `fields=*all` narrowed to the fields actually mapped below
(explicit `fields` param, not `*all`, to keep payloads small in production).

| Jira field (under `fields`) | Normalized field | Notes |
|---|---|---|
| `id` | `jira_id` | durable identity |
| `key` | `jira_key` | mutable on project rekey, see DATABASE-DESIGN §4 |
| `project.id` | `project_id` | resolved FK |
| `issuetype.id` | `issue_type_id` | resolved FK |
| `status.id` | `status_id` | resolved FK |
| `priority.id` | `priority_id` | resolved FK, nullable (some issue types have no priority field) |
| `summary` | `summary` | |
| `description` (ADF document) | `description` | Jira Cloud v3 returns Atlassian Document Format (rich JSON), not plain text. Store both the ADF JSON (in `raw_payload`) and a flattened plain-text rendering in `description` for simple consumption. |
| `assignee.accountId` | `assignee_id` | resolved FK, nullable |
| `reporter.accountId` | `reporter_id` | resolved FK |
| `customfield_XXXXX` (Sprint) | `sprint_id` | field ID varies per Jira instance — resolved once at startup via `GET /rest/api/3/field` lookup by name `"Sprint"`, cached in config |
| `customfield_XXXXX` (Story Points) | `story_points` | same per-instance field discovery pattern |
| `labels` | `labels` | stored as JSON text |
| `parent.id` | `parent_issue_id` | subtasks only |
| `created` | `jira_created_at` | |
| `updated` | `jira_updated_at` | this is the incremental sync watermark field |

**Custom field discovery**: because `Sprint` and `Story Points` are custom
fields whose IDs (`customfield_10020` etc.) are instance-specific, the
service resolves them once per environment at startup (or on a manual
"rediscover fields" admin action) by name-matching against
`GET /rest/api/3/field`, and stores the resolved IDs in `config/` (env
override supported for instances with ambiguous/duplicate field names).

## 7. Worklogs

Source: `GET /rest/api/3/issue/{issueIdOrKey}/worklog`, and for
incremental sync, the more efficient
`GET /rest/api/3/worklog/updated` + `GET /rest/api/3/worklog/list` pair
(returns updated worklog IDs since a timestamp, avoiding a full issue scan).

| Jira field | Normalized field |
|---|---|
| `id` | `jira_id` |
| `issueId` | `issue_id` (resolved FK) |
| `author.accountId` | `author_id` (resolved FK) |
| `timeSpentSeconds` | `time_spent_seconds` |
| `started` | `started_at` |
| `comment` (ADF or plain, version-dependent) | `comment` (flattened text) |
| `created` | `jira_created_at` |
| `updated` | `jira_updated_at` |

## 8. Changelog / status history

Source: `GET /rest/api/3/issue/{issueIdOrKey}/changelog` (paginated), or
embedded `changelog.histories` when `expand=changelog` is requested on the
issue search itself (preferred for incremental sync — avoids N+1 calls).

Each Jira "history" entry contains one or more "items" (field changes).
The service flattens each item into its own `jira_issue_changelog` row:

| Jira field | Normalized field |
|---|---|
| `history.id` + item index | `jira_history_id` (composite string, e.g. `"10041-0"`) |
| item.field | `field_name` |
| item.fromString | `from_value` |
| item.toString | `to_value` |
| history.author.accountId | `author_id` (resolved FK) |
| history.created | `changed_at` |

Only a curated subset of `field_name` values is stored by default
(`status`, `assignee`, `priority`, `sprint`) to avoid unbounded row growth
from every minor field edit; this filter is configurable
(`CHANGELOG_TRACKED_FIELDS` env var).

## 9. Rate limiting & pagination conventions

- Jira Cloud REST v3 uses `startAt`/`maxResults`/`total` (classic) or
  `nextPageToken` (newer endpoints like `/search/jql`) — `integrations/jira`
  normalizes both into a single async-iterator interface so `sync/` never
  deals with pagination mechanics directly.
- Jira returns `429` with `Retry-After`; the client honors it with
  exponential backoff (see `utils/retry.js`), capped at a configurable max
  attempts before surfacing to `sync_errors`.

## 10. Forward-looking (not in initial phase)

- Jira Cloud is deprecating some legacy search endpoints in favor of
  `/rest/api/3/search/jql` — the client should target the current
  non-deprecated endpoint at implementation time and this doc updated
  accordingly (tracked in `PROGRESS.md`).
