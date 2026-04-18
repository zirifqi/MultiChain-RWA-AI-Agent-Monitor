# API Service

Read API for canonical RWA monitoring events and risk signals.

## Endpoints
- `GET /health`
- `GET /events?limit=50&chain=ethereum&type=NAVUpdated`
- `GET /events/:id` (joined event + risk signal)
- `GET /signals?limit=50&chain=ethereum&type=YieldDropped&severity=warning&minScore=60&maxScore=95`

## Start (development)

```bash
pnpm --filter @rwa-monitor/api dev
```
