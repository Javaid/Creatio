# Creatio Integration

How Creatio 8.3.x, on IIS/MSSQL, consumes this service in practice. This
document is the "downstream consumer" companion to `API-CONTRACT.md`; that
document defines the contract, this one describes the recommended
consumption pattern on the Creatio side.

## 1. Integration principle

Creatio integrates with this service **exclusively over HTTP** — REST calls
out to this service, and an HTTP receiver endpoint inside Creatio for
inbound webhooks. There is no database link, linked server, or shared
schema between Creatio's MSSQL database and this service's MSSQL database,
even though both may run on the same SQL Server instance/host in a given
deployment. That adjacency is incidental infrastructure, not an
integration path, and must never be used as one (e.g. no cross-database
`SELECT`/`JOIN` from Creatio's DB into this service's tables).

## 2. Recommended Creatio-side building blocks

Implemented entirely within Creatio using its own supported extensibility
(no changes needed in this repo):

1. **A Creatio integration package** containing:
   - A scheduled process (Creatio's "Business Process" scheduler or a
     .NET scheduled job) that calls `GET /api/v1/issues?updatedSince=...`
     etc. on a cadence, for installations that prefer a pull model.
   - A custom REST endpoint (e.g. `/rest/JiraSyncWebhookService/Receive`)
     implemented as a Creatio web service, registered as the `targetUrl`
     when registering a webhook subscription via
     `POST /api/v1/webhooks/subscriptions`. This is Creatio's inbound
     receiver for the push model.
2. **Signature verification** in that receiver: recompute
   `HMAC-SHA256(rawBody, subscriptionSecret)` and compare to the
   `X-Signature` header before trusting the payload (see `SECURITY.md`
   §4). Reject with `401` on mismatch.
3. **Idempotent upsert logic** in Creatio, keyed on `data.jiraKey` (or the
   service's `id`) — since delivery is at-least-once, Creatio must treat a
   duplicate `eventId` as a no-op.
4. **Mapping Creatio objects** (Case, Activity, custom "Jira Issue" object,
   etc.) to the normalized fields in `API-CONTRACT.md` §2 — this mapping is
   entirely a Creatio-side configuration concern and intentionally not
   specified by this service, since the service has no opinion on Creatio's
   object model (per the independence constraint).

## 3. Push vs. pull — when to use which

| Mode | When Creatio should use it |
|---|---|
| **Webhook push** | Near-real-time updates (issue status changes, new worklogs) where Creatio should react promptly (e.g. updating a linked Case). Register once via `POST /webhooks/subscriptions`. |
| **REST pull** | Bulk/catch-up scenarios: initial backfill into Creatio, recovery after a Creatio-side outage (using `updatedSince`), or environments where inbound HTTP to Creatio isn't network-reachable from this service (e.g. Creatio behind a firewall with no public endpoint). |

Both can run simultaneously — the webhook keeps things fresh, and a lower
frequency reconciliation pull (e.g. hourly, using `updatedSince`) guards
against missed webhook deliveries after retries are exhausted.

## 4. Network topology assumptions

- This service is reachable from Creatio's IIS host over HTTPS (same
  network/VPN or public with IP allowlisting — see `SECURITY.md`).
- For the webhook push direction, Creatio's receiver endpoint must be
  reachable from this service. In an on-prem Creatio deployment without a
  public endpoint, prefer the REST pull mode, or place both behind the same
  internal network/VPN.
- No assumption is made about Creatio's IIS site bindings, app pool
  identity, or internal architecture beyond "it can make/receive HTTPS
  calls." Nothing here depends on Creatio version internals beyond its
  documented REST/webhook capabilities, which are stable API surfaces
  meant to survive Creatio version upgrades.

## 5. Authentication of Creatio → this service calls

Creatio authenticates as a registered API client (`api_clients` table, see
`DATABASE-DESIGN.md`), using a bearer token issued out-of-band by an
operator (see `SECURITY.md` §2 for issuance/rotation). Creatio stores this
token in its own secure parameter store (Creatio "System Settings" marked
as encrypted, not a plain constant), never hardcoded in a business process.

## 6. Example flow — issue status change reaching Creatio

1. Jira issue `PROJ-123` transitions to "Done."
2. Jira webhook fires → this service's `webhooks/inbound` receives it →
   `sync/` upserts `jira_issues` and appends a `jira_issue_changelog` row.
3. `sync/` emits an `issue.updated` domain event.
4. `webhooks/outbound` finds Creatio's subscription for `issue.updated`,
   signs the payload, `POST`s to Creatio's receiver endpoint.
5. Creatio's receiver verifies the signature, looks up (or creates) the
   linked Creatio record by `jiraKey`, updates its status field, and
   returns `200`.
6. If step 4's delivery fails (Creatio endpoint down), it retries with
   backoff (`outbound_webhook_deliveries`); Creatio's own hourly
   reconciliation pull (§3) catches up regardless once it's back.

## 7. What Creatio should never do

- Never query this service's SQL Server database directly, even read-only,
  even if network-reachable. All access is through the REST API.
- Never assume undocumented fields in `raw_payload` are stable — only
  fields listed in `API-CONTRACT.md` are covered by the compatibility
  policy.
- Never treat `jiraKey` as immutable long-term storage key for
  cross-referencing without also storing the service's own `id` — key
  volatility is explained in `DATABASE-DESIGN.md` §4.
