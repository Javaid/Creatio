# logging/

Structured logger configuration (levels, JSON output, correlation/request
IDs, secret redaction). Used by every other module via a single shared
logger instance — see `docs/SECURITY.md` §2 on redaction rules.
