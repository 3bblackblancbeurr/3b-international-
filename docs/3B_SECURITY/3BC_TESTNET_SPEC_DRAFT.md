# 3BC Testnet Specification Draft — v0

Status: design-only. No 3BC mainnet or real-value asset is authorized by this document.

## Zero-value rule
A future 3BC testnet must have **zero monetary value**:
- no sale;
- no purchase with fiat/crypto;
- no exchange listing;
- no bridge to a production network;
- no redemption promise;
- no production custody;
- no real-world reward conversion;
- faucet-only distribution of valueless test units.

Test units must be visually and technically marked as test assets.

## Separation
- Game XP/Coins remain SQL application economy.
- Passport remains application identity.
- 3BC testnet ledger is a separate protocol state.
- Quant is an observer.
- Vault is separate from the application database.

## Key/material separation
- generate dedicated non-production test keys;
- never import a production/user seed into testnet;
- never reuse testnet signer keys on mainnet;
- no Vault production share may exist in the testnet environment;
- recovery drills use disposable non-production material;
- logs must still never contain private keys or recovery shares.

## Network identity
The testnet requires:
- unique chain ID;
- unique genesis hash;
- explicit network/version bytes in addresses/transactions;
- replay protection so testnet signatures cannot become mainnet transactions.

Values are deliberately TBD until the network/consensus choice is reviewed.

There must be no automatic bridge, address alias or signature compatibility path that can turn a testnet authorization into a production authorization.

## Transaction envelope
A future transaction must bind at minimum:
- protocol version;
- chain ID;
- sender/public-key identity;
- destination;
- amount;
- fee rule identifier;
- nonce or equivalent anti-replay state;
- expiry/validity window if adopted;
- cryptographic suite identifier;
- signature.

Changing any signed field must invalidate the signature.

## Deterministic validation
All honest nodes must derive the same result from the same prior state + valid transaction sequence.

Reject when:
- signature invalid;
- wrong chain ID;
- replay/nonce invalid;
- amount <= 0;
- balance/input insufficient;
- overflow/underflow;
- fee rule invalid;
- protocol/suite unsupported.

## Monetary state
Before supply values are chosen, the protocol must implement properties rather than marketing numbers:
- supply never negative;
- supply never exceeds configured maximum;
- mint only through consensus-authorized transition;
- burn only through explicit transition;
- no administrator-only hidden mint.

## Consensus
Not chosen yet.

Candidates must be compared on:
- safety/finality;
- Sybil resistance;
- cost of majority attack at small network size;
- validator/miner decentralization;
- hardware concentration risk;
- recovery/fork rules;
- operational complexity.

Do not purchase ASIC/mining hardware until this decision is made.

## Test requirements
At minimum:
- duplicate transaction submission;
- replay from another chain ID;
- out-of-order nonce;
- concurrent spend race;
- node crash during commit;
- database/disk corruption recovery;
- malicious peer messages;
- network partition/rejoin;
- signer-key rotation;
- cryptographic-suite migration simulation;
- supply property fuzzing.

## Testnet entry gate
Even zero-value testnet code remains blocked until:
- Wallet model approved;
- Vault strategy approved;
- cryptographic suite reviewed;
- explicit testnet authorization recorded in the database release gate.

## Mainnet blocker
No testnet success can itself authorize real funds. Independent cryptographic audit, red-team, Vault recovery drill, protocol review, MiCA/AMF legal review and explicit mainnet authorization remain mandatory.
