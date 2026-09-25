# Jira → Creatio Sync Service

A standalone Node.js/Express service that retrieves, normalizes, stores,
and synchronizes data from Jira, and exposes it to a local Creatio 8.3.x
installation via a versioned REST API and outbound webhooks.

The service is fully independent from Creatio: it owns its own SQL Server
database, never touches Creatio's database, and is consumed only through
the documented HTTP contract.

## Status

**Data foundation phase.** Architecture and API contract are documented;
`config/`, `logging/`, and `models/` (Sequelize schema + migrations for the
full data model) are implemented and tested. The Jira integration client,
sync engine, and REST/webhook surface have not been built yet. See
`docs/PROGRESS.md` for current status and next steps.

## Documentation

Start here, in order:

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — component model, data
   flow, layering rules.
2. [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md) — the stable REST +
   webhook contract Creatio consumes.
3. [`docs/DATABASE-DESIGN.md`](docs/DATABASE-DESIGN.md) — this service's
   own SQL Server schema.
4. [`docs/JIRA-MAPPING.md`](docs/JIRA-MAPPING.md) — Jira entity → normalized
   model field mapping.
5. [`docs/CREATIO-INTEGRATION.md`](docs/CREATIO-INTEGRATION.md) — how
   Creatio should consume this service.
6. [`docs/SECURITY.md`](docs/SECURITY.md) — authentication, secrets,
   webhook signing.
7. [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — IIS/iisnode hosting model.
8. [`docs/PROGRESS.md`](docs/PROGRESS.md) — living log of decisions and
   next steps.

## Project structure

```
src/
  config/          environment configuration loading & validation
  controllers/     HTTP request handlers
  routes/          Express route definitions
  services/        small cross-cutting application services
  integrations/
    jira/          the only module that talks to Jira's REST API
  repositories/    persistence access (Sequelize / parameterized SQL)
  models/          Sequelize models + migrations
  validators/      Joi request validation schemas
  middleware/      auth, validation wiring, error handling, rate limiting
  utils/           stateless shared helpers
  jobs/            scheduled sync triggers (node-cron)
  webhooks/
    inbound/       Jira webhook receiver
    outbound/      Creatio webhook dispatcher
  sync/            the sync engine (full/incremental, checkpoints, mapping)
  logging/         structured logger configuration
tests/
  unit/
  integration/
```

Each folder currently contains a `README.md` describing its responsibility
until real code lands.

## Technology

Node.js, JavaScript (no TypeScript), Express, Microsoft SQL Server
(Sequelize + parameterized SQL), Joi, Axios, Jest, dotenv, structured
logging (winston). Deployed under IIS via iisnode — see
`docs/DEPLOYMENT.md`.

## Local development

```bash
cp .env.example .env   # fill in DB + Jira credentials
npm install
npm run dev
```

`GET /healthz` should respond `{"status":"ok"}` once running.

## Testing

```bash
npm test
```
