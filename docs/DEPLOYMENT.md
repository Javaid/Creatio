# Deployment (IIS / Windows)

Target: Windows Server hosting IIS, alongside (or near) the local Creatio
8.3.x installation and its SQL Server instance. This service runs as a
Node.js process hosted under IIS via **iisnode**, not as a Linux service and
not under PM2.

## 1. Prerequisites on the target server

- IIS with the **iisnode** module installed
  (https://github.com/Azure/iisnode releases for Windows).
- **URL Rewrite Module** for IIS (iisnode setups route all traffic through
  `web.config` rewrite rules into the Node process).
- Node.js runtime installed on the server, version pinned in `package.json`
  `engines` field and matched by the iisnode configuration
  (`nodeProcessCommandLine` in `web.config` if a non-default Node install
  path is used).
- Network access from this server to Jira (outbound HTTPS, 443) and to/from
  Creatio's IIS site (per `CREATIO-INTEGRATION.md` §4).
- A dedicated SQL Server database/login for this service (see
  `DATABASE-DESIGN.md`, `SECURITY.md` §8) — created ahead of first
  deployment, separate from any Creatio database on the same instance.

## 2. Site layout

```
C:\inetpub\jira-sync-service\
├── web.config              ← IIS/iisnode configuration (committed, see §3)
├── server.js                ← Node entry point iisnode launches
├── package.json
├── node_modules\            ← installed on the server (npm ci), not committed
├── src\
├── .env                     ← environment config, NOT committed, deployed separately
└── logs\                    ← iisnode stdout/stderr capture directory
```

Deployment is a file copy (or CI artifact publish) into this directory plus
`npm ci --omit=dev` on the server, followed by an IIS app pool
recycle/restart. No build step is required (plain JavaScript, no
transpilation).

## 3. `web.config` (iisnode configuration)

Committed at the repo root as the canonical IIS entry point:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}" />
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          </conditions>
          <action type="Rewrite" url="server.js" />
        </rule>
      </rules>
    </rewrite>
    <iisnode
      node_env="production"
      loggingEnabled="true"
      logDirectory="logs"
      watchedFiles="web.config;*.js"
      nodeProcessCountPerApplication="1"
    />
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="node_modules" />
          <add segment=".env" />
        </hiddenSegments>
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

Notes:
- `nodeProcessCountPerApplication="1"` avoids the in-process scheduler
  (`jobs/`) running multiple times concurrently in a web-garden. If IIS
  web-garden mode (multiple worker processes) is ever required for
  throughput, the scheduler must switch to a DB-backed leader lock (see
  `ARCHITECTURE.md` §7) — not needed for a single-process deployment.
- `.env` and `node_modules` are hidden from direct HTTP access as
  defense-in-depth (belt-and-suspenders alongside them not being under a
  public web root logically anyway).
- `server.js` binds to the named pipe / port iisnode provides via
  `process.env.PORT`, not a hardcoded port — this is what makes it portable
  between iisnode and a plain `node server.js` run locally for development.

## 4. Environment configuration

All runtime configuration is via environment variables (loaded with
`dotenv` in local/dev; set as actual Windows/IIS environment variables or
an IIS `web.config` `<environmentVariables>` block in production — `.env`
files are a development convenience, not how production secrets are
delivered). See `.env.example` for the full variable list, grouped as:

- `NODE_ENV`, `PORT`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`
- `JIRA_BASE_URL`, `JIRA_AUTH_MODE` (`cloud-token`|`server-pat`),
  `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEYS`
- `SYNC_INCREMENTAL_CRON`, `SYNC_FULL_CRON`, `SYNC_ERROR_RETRY_CRON`
- `LOG_LEVEL`, `LOG_FORMAT`
- `WEBHOOK_SIGNING_ALGO` (fixed `sha256`, documented for clarity)

Config is loaded once at boot through `src/config/index.js`, validated
against a Joi schema, and the process **fails fast** (non-zero exit) if a
required variable is missing — this fails loudly under iisnode (visible in
`logs/`) rather than starting in a half-configured state.

## 5. Process lifecycle under iisnode

- IIS starts the Node process on first request (or eagerly, if configured)
  and recycles it per the app pool's normal recycling policy — no PM2, no
  custom process manager needed.
- Graceful shutdown: the process listens for iisnode's shutdown signal
  (`process.on('SIGTERM', ...)`) to close the SQL Server connection pool
  and let in-flight requests drain before exit.
- The in-process scheduler (`jobs/`) starts on process boot and stops on
  shutdown alongside the HTTP server — they share the same process
  lifecycle by design (§3 note on single-process constraint).

## 6. Logging & monitoring

- iisnode captures stdout/stderr into `logs/` — the app's structured
  logger (`logging/`) writes JSON lines to stdout in production, which
  iisnode persists; log rotation is handled by iisnode's own
  `maxLogFileSizeInKB` setting.
- `GET /healthz` and `GET /readyz` (see `API-CONTRACT.md` §6) are the
  integration points for any external monitoring (IIS Application
  Request Routing health checks, or a Windows Scheduled Task ping, or a
  monitoring agent already present on the box).

## 7. Database migrations on deploy

- Sequelize CLI migrations (`npx sequelize-cli db:migrate`) run as an
  explicit, separate deployment step before the app pool is restarted onto
  new code — never auto-run on app boot in production, to keep schema
  changes a deliberate, observable step.

## 8. Rollback

- Because deployment is a file copy + migration step, rollback is: restore
  the previous release's file set, and if the new release included a
  migration, run its corresponding `down` migration before restoring code
  (standard Sequelize migration discipline — every `up` ships with a
  working `down`).

## 9. Local development parity

- Locally, `npm run dev` runs the same `server.js` with `node` directly
  (reading `.env`), so the exact same code path that will run under iisnode
  is exercised in development — the only IIS-specific piece is `web.config`
  itself, which is inert outside of IIS.
