# 3B Formal Security Properties — Preparation

These properties are candidates for property-based testing, model checking or formal verification.

## Economy
- XP never decreases except an explicitly versioned administrative correction path.
- Coins balance never becomes negative.
- An idempotency key changes economic state at most once.
- A non-repeatable reward is credited at most once per user.
- Daily caps are never exceeded by concurrent requests.
- World reward outbox item reaches at most one credited economic transition.

## City 3B
- A building purchase is atomic: debit and placement either both commit or both fail.
- An upgrade is atomic: debit, level increment and audit record agree.
- Existing city ownership cannot move to another user through client-controlled input.
- Existing city access cannot be re-locked by a new progression rule.

## Identity
- Passport profile user_id equals authenticated session user_id.
- Account switching cannot reuse the prior user's Passport, wallet or City cache.
- A client-supplied user_id never overrides authenticated identity.

## Future 3BC
- total_supply <= MAX_SUPPLY.
- No transaction executes twice.
- No negative balance.
- Sum of balances plus defined system accounts equals supply.
- A transaction signed for chain A is invalid on chain B.
- A transaction mutated after signing is invalid.
- Mint requires the exact authorized protocol path.
- A single administrator cannot unilaterally mint or drain Vault funds.

## Verification ladder
1. unit tests;
2. property-based fuzzing;
3. concurrency tests;
4. fault injection;
5. model checking for simplified state machine;
6. formal proof where critical/value justifies it;
7. independent review.
