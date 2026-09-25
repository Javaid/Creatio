# models/

Sequelize model definitions mapping to this service's own SQL Server
schema (never Creatio's). Migrations live in `models/migrations/` and are
the only supported way to change schema (no manual DDL against target
servers). See `docs/DATABASE-DESIGN.md`.

- `index.js` — Sequelize bootstrap; loads every model file in this
  directory and wires `associate()` calls. `require('../models')` gives
  `{ JiraIssue, JiraProject, ..., sequelize, Sequelize }`.
- `_columns.js` — shared UUID primary key column definition (SQL Server
  `NEWSEQUENTIALID()`). Prefixed with `_` so the loader in `index.js`
  skips it.
- One file per table (`jiraProject.js`, `jiraIssue.js`, `syncHistory.js`,
  `apiClient.js`, ...), matching the schema in `docs/DATABASE-DESIGN.md`
  1:1.
- `migrations/` — one `sequelize-cli` migration per table, in FK-dependency
  order. Run with `npm run migrate`; roll back with `npm run migrate:undo`.
  No `onDelete: CASCADE` is used anywhere — SQL Server rejects multiple
  cascade paths into the same table, and this schema has several tables
  with more than one FK path from `jira_projects`/`jira_issues`. Deletes are
  expected to be rare (this is a sync mirror); use `is_active` flags or
  application-level cleanup instead of relying on cascading deletes.
