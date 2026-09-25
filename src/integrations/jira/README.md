# integrations/jira/

The only module allowed to speak Jira's REST API directly (auth,
pagination, rate-limit backoff). Exposes a Jira-flavor-agnostic interface
(Cloud vs. Server/DC differences isolated behind an adapter) consumed by
`sync/`. See `docs/JIRA-MAPPING.md`.
