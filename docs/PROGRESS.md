# Progress Log

Living document. Update this whenever a phase completes, a decision is
made, or a decision is deferred. Newest entries at the top.

---

## 2026-09-25 — Phase 0: Foundation (architecture & scaffolding)

**Status: complete.**

### What was done

- Inspected the repository: it was empty (no commits, no files) on branch
  `claude/fervent-cori-jbel41`. This is a greenfield project.
- Wrote the foundational documentation set:
  - `ARCHITECTURE.md` — component model, layering, data flow, non-goals.
  - `API-CONTRACT.md` — the stable REST + webhook contract Creatio consumes.
  - `DATABASE-DESIGN.md` — the service's own SQL Server schema.
  - `JIRA-MAPPING.md` — field-level Jira → normalized model mapping.
  - `CREATIO-INTEGRATION.md` — how Creatio should consume this service.
  - `SECURITY.md` — auth, secrets, signing, least privilege.
  - `DEPLOYMENT.md` — IIS/iisnode hosting model.
  - `PROGRESS.md` — this file.
- Scaffolded the initial project structure (folders + placeholder/config
  files only — no business logic yet):
  ```
  src/
    config/
    controllers/
    routes/
    services/
    integrations/jira/
    repositories/
    models/
    validators/
    middleware/
    utils/
    jobs/
    webhooks/
    sync/
    logging/
  tests/
  ```
  Plus `package.json`, `.env.example`, `.gitignore`, `README.md`,
  `web.config`, `server.js` (minimal boot stub).

### Major decisions made

1. **Independence enforced structurally**: no module under `src/` may
   import anything Creatio-specific; Creatio interaction is confined to
   documentation of the contract (`API-CONTRACT.md`,
   `CREATIO-INTEGRATION.md`) that Creatio-side code (out of this repo)
   implements against.
2. **Own SQL Server database**, never shared tables/schema with Creatio,
   even when co-located on the same SQL Server instance.
3. **Both push (webhooks) and pull (REST with `updatedSince`)** consumption
   modes are supported so Creatio's network topology (public endpoint or
   not) doesn't block integration.
4. **Jira Cloud REST v3 first-class**, Jira Server/Data Center supported via
   an adapter seam in `integrations/jira`, not by branching throughout the
   codebase.
5. **DB-backed retry/dead-letter queues** for both inbound sync errors and
   outbound webhook deliveries — no message broker in this phase.
6. **In-process scheduler** (`jobs/`, likely `node-cron`), single Node
   process under iisnode, no PM2, no separate worker process.
7. **Custom Jira fields (Sprint, Story Points) resolved dynamically** per
   instance via the Jira `field` API rather than hardcoded IDs, since
   `customfield_XXXXX` IDs are not portable across Jira instances.
8. **Sequelize** as the primary data-access layer, with parameterized raw
   SQL permitted where Sequelize is awkward (e.g. complex upserts), per the
   task's technology constraints.

### Unresolved decisions (need a decision before/during implementation)

- [ ] **Jira webhook auth mechanism**: whether to register a classic Jira
      webhook (shared secret / IP allowlist only) or build a small
      Connect/Forge app for JWT-signed webhooks. Affects
      `webhooks/inbound` implementation and `SECURITY.md` §3a.
- [ ] **Jira edition in the actual target environment**: Cloud vs.
      Server/Data Center. This changes auth (API token+email vs. PAT),
      base API version (`/3/` vs `/2/`), and user identity field
      (`accountId` vs `key`). Needs confirmation before
      `integrations/jira` is implemented.
- [ ] **API client token lifecycle**: long-lived opaque keys (simpler,
      chosen as the default) vs. short-lived JWT + refresh (more moving
      parts). Default: opaque keys for phase 1; revisit if Creatio's own
      constraints push otherwise.
- [ ] **Webhook secret storage**: store only a hash and require the signer
      to keep the plaintext secret elsewhere (typical pattern), vs.
      reversible encryption at rest so the service itself could resend/
      re-sign. Leaning toward hash-only (simpler threat model); confirm
      during `webhooks/outbound` implementation.
- [ ] **Multi-tenancy**: current design assumes one Jira instance → one
      deployment of this service → one (or more) Creatio consumers via
      multiple `api_clients`. Multi-Jira-instance support is not designed
      and would need a `jira_instance_id` dimension threaded through most
      tables if ever required.
- [ ] **Scheduler clustering**: current design assumes a single Node
      process (`nodeProcessCountPerApplication="1"`). If IIS web-garden
      (multiple worker processes) becomes a requirement for throughput,
      the scheduler needs a DB-backed leader lock — not built yet.
- [ ] **Jira Cloud endpoint migration**: some legacy search endpoints are
      being deprecated in favor of `/rest/api/3/search/jql`. Confirm which
      is current at implementation time (see `JIRA-MAPPING.md` §10).

### Next implementation step

Phase 1 (not started): implement `config/` (env loading + validation),
`logging/` (structured logger setup), and `models/` (Sequelize models +
initial migration for all tables in `DATABASE-DESIGN.md`) — the
foundation every other module depends on. Then `integrations/jira`
(read-only client for projects/issues first), followed by a minimal
`sync/` full-sync path for a single entity type (projects) end-to-end,
validated against a real or sandboxed Jira instance, before expanding to
the rest of the entity types and the webhook/API surface.

Do not start Phase 1 until the unresolved decisions above that affect it
(Jira edition, webhook auth mechanism) are confirmed — both block
`integrations/jira` and `webhooks/inbound` design specifics.
