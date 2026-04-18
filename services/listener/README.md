# Listener Service

Multi-chain event listener for RWAMonitor contracts.

## Responsibilities
- Subscribe to canonical RWAMonitor events on 5 chains
- Normalize event payloads into a shared schema
- Score events through AI risk pipeline (schema-validated)
- Trigger Telegram alerts based on severity thresholds
- Persist canonical events + risk signals to SQLite

## Start (development)

```bash
pnpm --filter @rwa-monitor/listener dev
```
