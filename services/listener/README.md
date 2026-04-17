# Listener Service

Multi-chain event listener for RWAMonitor contracts.

## Responsibilities
- Subscribe to canonical RWAMonitor events on 5 chains
- Normalize event payloads into a shared schema
- Persist canonical events to SQLite

## Start (development)

```bash
pnpm --filter @rwa-monitor/listener dev
```
