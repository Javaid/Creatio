# sync/

The sync engine: orchestrates full and incremental sync runs, owns
checkpoint/cursor logic, normalizes Jira payloads into this service's
domain model, decides create/update/skip, and emits domain events consumed
by `webhooks/outbound`. See `docs/ARCHITECTURE.md` §5 and
`docs/JIRA-MAPPING.md`.
