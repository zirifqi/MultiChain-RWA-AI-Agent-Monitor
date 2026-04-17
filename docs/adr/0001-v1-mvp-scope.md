# ADR-0001: V1 MVP Scope and Delivery Sequence

- Status: Accepted
- Date: 2026-04-17

## Context

The project needs a practical first release that proves end-to-end value quickly:

1. Detect meaningful RWA events on-chain
2. Normalize and analyze signals off-chain
3. Deliver actionable alerts
4. Expose visibility through a simple dashboard

Without strict scope boundaries, implementation can expand too fast and delay usable output.

## Decision

Adopt a focused V1 MVP with the following boundaries:

### Networks
- Ethereum Mainnet
- Arbitrum One
- Base
- Optimism
- BNB Smart Chain (BSC)

### Canonical Event Types
- `NAVUpdated`
- `YieldDropped`
- `MaturityApproaching`
- `LargeTransferDetected`
- `ComplianceFlagRaised`

### Alert Severity
- `info`
- `warning`
- `critical`

### Delivery Sequence
1. Smart contract event layer (Solidity + Foundry)
2. Multi-chain listener and normalized internal event schema
3. AI scoring layer with strict JSON output schema
4. Telegram alerting (Discord after Telegram is stable)
5. Minimal API and dashboard timeline views
6. Security and CI hardening

## Consequences

### Positive
- Fastest path to a demonstrable, open-source MVP
- Lower coordination overhead across modules
- Easier testing and incident triage

### Trade-offs
- Some advanced capabilities are deferred (AA execution, verifiable AI proof anchoring)
- Initial dashboard scope is intentionally limited

## Deferred for V1.x
- ERC-4337 auto-execution policies
- On-chain hash anchoring of model reasoning
- Full portfolio optimization workflows
