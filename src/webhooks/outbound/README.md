# webhooks/outbound/

Fans out domain events (issue created/updated, etc.) to Creatio-registered
webhook subscriptions, HMAC-signs each payload, and manages retry/dead-
letter delivery tracking. See `docs/API-CONTRACT.md` §5 and
`docs/SECURITY.md` §4.
