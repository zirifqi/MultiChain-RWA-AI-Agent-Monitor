# Monorepo Layout Rationale

Chosen architecture: **Monorepo**.

## Key reasons
1. Tight coupling between smart contract events and listener/AI schemas.
2. Shared event typings reduce drift and parsing bugs.
3. Faster contributor onboarding with one repo + one CI entrypoint.
4. Easier security policy enforcement (Slither/Mythril/coverage gates) in one pipeline.
