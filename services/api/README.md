# API Service

Read API for canonical RWA monitoring events and risk signals.

## Endpoints
- `GET /health`
- `GET /events?limit=50&chain=ethereum&type=NAVUpdated`
- `GET /events/:id` (joined event + risk signal)
- `GET /signals?limit=50&chain=ethereum&type=YieldDropped&severity=warning&minScore=60&maxScore=95`
- `GET /alerts/outbox?limit=50&status=failed&channel=telegram&chain=ethereum&type=YieldDropped&severity=warning&minAttempts=1&decisionCode=delivery_failed`
- `GET /alerts/outbox/:eventId`
- `GET /summary/severity-counts`
- `GET /summary/alerts-health`
- `GET /summary/risk-trend?window=24h` (supports `h` or `d`, e.g. `12h`, `7d`)
- `GET /summary/alerts-trend?window=24h` (supports `h` or `d`)

## Database

API runs SQLite migrations automatically on startup via the shared migrator.

## Start (development)

```bash
pnpm --filter @rwa-monitor/api dev
```
