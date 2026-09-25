# webhooks/inbound/

Receives Jira webhook events (issue/worklog/sprint changes), validates
the shared secret (see `docs/SECURITY.md` §3a), and triggers a targeted
upsert through `sync/`. Must respond quickly — no heavy synchronous work.
