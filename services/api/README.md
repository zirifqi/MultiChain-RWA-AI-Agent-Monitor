# API Service

Read API for canonical RWA monitoring events and risk signals.

## Endpoints
- `GET /health`
- `GET /events?limit=50&cursor=2026-04-22T12:00:00.000Z&chain=ethereum&type=NAVUpdated`
- `GET /events/:id` (joined event + risk signal)
- `GET /signals?limit=50&cursor=2026-04-22T12:00:00.000Z&chain=ethereum&type=YieldDropped&severity=warning&minScore=60&maxScore=95`
- `GET /alerts/outbox?limit=50&cursor=2026-04-22T12:00:00.000Z&status=failed&channel=telegram&chain=ethereum&type=YieldDropped&severity=warning&minAttempts=1&decisionCode=delivery_failed`
- `GET /alerts/outbox/:eventId`
- `GET /summary/severity-counts`
- `GET /summary/alerts-health`
- `GET /summary/risk-trend?window=24h` (supports `h` or `d`, e.g. `12h`, `7d`)
- `GET /summary/alerts-trend?window=24h` (supports `h` or `d`)
- `GET /metrics?windowHours=24&format=json|prom`
- `POST /ops/alerts/requeue-failed` body: `{ "dryRun": true, "limit": 500 }`
- `POST /ops/alerts/recover-stale` body: `{ "dryRun": true, "processingTimeoutSeconds": 120, "limit": 500 }`
  - Ops endpoints support auth token via `x-ops-token: <OPS_API_TOKEN>` or `Authorization: Bearer <OPS_API_TOKEN>`.
  - If `OPS_API_TOKEN` is empty, ops endpoints stay open (dev mode).

## Validation & pagination

- Query/params are validated with Zod.
- Invalid inputs return `400` with validation details.
- List endpoints return `{ items, pageInfo: { limit, nextCursor } }`.

## Database

API runs SQLite migrations automatically on startup via the shared migrator.

## Start (development)

```bash
pnpm --filter @rwa-monitor/api dev
```
