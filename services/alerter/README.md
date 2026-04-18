# Alerter Service

Consumes queued alert jobs and sends delivery notifications (Telegram for now).

## Responsibilities
- Poll `alert_outbox` queue from SQLite
- Join with `canonical_events` + `risk_signals`
- Apply severity threshold policy
- Send Telegram alerts
- Update queue status (`processing`, `sent`, `failed`) with retry backoff

## Queue contract
Input queue table produced by listener:
- `alert_outbox(event_id, channel, status, attempts, last_error, next_retry_at, created_at, updated_at)`

## Env
- `ALERTER_POLL_INTERVAL_MS`
- `TELEGRAM_ALERTS_ENABLED`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `ALERT_INFO_MIN_SCORE`
- `ALERT_WARNING_MIN_SCORE`
- `ALERT_CRITICAL_MIN_SCORE`

## Start (development)

```bash
pnpm --filter @rwa-monitor/alerter dev
```
