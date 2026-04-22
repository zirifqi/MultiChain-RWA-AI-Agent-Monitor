# Listener Service

Multi-chain event listener for RWAMonitor contracts.

## Responsibilities
- Subscribe to canonical RWAMonitor events on 5 chains
- Normalize event payloads into a shared schema
- Score events through AI risk pipeline (schema-validated)
- Persist canonical events + risk signals to SQLite
- Publish alert jobs into `alert_outbox` (service contract for alerter)

## Cross-service contract
Listener writes queued alert jobs to SQLite table:
- Table: `alert_outbox`
- PK: `(event_id, channel)`
- Status flow: `pending -> processing -> sent|failed`

Alerter service consumes from this table and handles Telegram delivery.

## Database migration

```bash
pnpm --filter @rwa-monitor/listener db:migrate
pnpm --filter @rwa-monitor/listener db:migrate:status
```

Migrations are versioned SQL files in `infra/migrations/sqlite` and tracked via `schema_migrations`.

## Start (development)

```bash
pnpm --filter @rwa-monitor/listener dev
```
