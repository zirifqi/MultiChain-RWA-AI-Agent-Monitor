# Contracts

Solidity contracts for the MultiChain-RWA-AI-Agent-Monitor project.

## Stack
- Solidity `^0.8.28`
- Foundry (`forge`, `cast`, `anvil`)
- OpenZeppelin upgradeable contracts (UUPS + Ownable2Step)

## Main Contract
- `src/core/RWAMonitor.sol`
  - Emits canonical RWA monitoring events:
    - `NAVUpdated`
    - `YieldDropped`
    - `MaturityApproaching`
    - `LargeTransferDetected`
    - `ComplianceFlagRaised`

## Test Layout
- `test/unit` — unit tests
- `test/integration` — integration tests
- `test/fuzz` — fuzz tests
- `test/invariant` — invariant tests

## Run Tests

```bash
cd contracts
forge test -vvv
```
