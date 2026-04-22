# Alerter Service

Consumes queued alert jobs and sends delivery notifications (Telegram for now).

## Responsibilities
- Poll `alert_outbox` queue from SQLite
- Join with `canonical_events` + `risk_signals`
- Apply severity threshold policy
- Apply anti-spam policy (cooldown dedupe)
- Escalate repeated incidents in a time window
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
- `ALERT_COOLDOWN_SECONDS`
- `ALERT_ESCALATION_WINDOW_SECONDS`
- `ALERT_ESCALATION_REPEAT_COUNT`

## Alert policy behavior
- **Threshold gating:** only sends if risk score meets severity threshold
- **Cooldown dedupe:** suppresses duplicate alerts (same asset+type+severity) within cooldown
- **Escalation override:** repeated same asset+type alerts within escalation window can bypass suppression and send as escalated

## Decision codes (audit trail)
Stored in `alert_outbox.decision_code` + `decision_note`:
- `queued_for_delivery`
- `dispatching`
- `suppressed_below_threshold`
- `suppressed_cooldown_duplicate`
- `sent_threshold_met`
- `sent_escalated_override`
- `delivery_failed`

## Start (development)

```bash
pnpm --filter @rwa-monitor/alerter dev
```

## Run tests

```bash
pnpm --filter @rwa-monitor/alerter test
```

## Policy tests (manual baseline)

Test files:
- `services/alerter/test/test1-threshold-gating.test.mjs`
- `services/alerter/test/test2-cooldown-dedupe.test.mjs`
- `services/alerter/test/test3-escalation.test.mjs`
- `services/alerter/test/test4-retry-backoff.test.mjs`

Run:

```bash
node --test services/alerter/test/*.test.mjs
```

Latest result:
- tests: **4**
- pass: **4**
- fail: **0**
