# logging/

Structured logger configuration (levels, JSON output, correlation/request
IDs, secret redaction). Used by every other module via a single shared
logger instance — see `docs/SECURITY.md` §2 on redaction rules.

- `logger.js` — the shared winston instance. `require('../logging/logger')`.
- `redact.js` — recursively strips known secret-shaped keys from log
  metadata before it's written.
- `withCorrelationId.js` — `withCorrelationId(id)` returns a child logger
  that stamps every entry with a request/sync-run id, used by
  `middleware/` and `sync/`.
