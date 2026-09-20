# 3BC Regulatory Gate — MiCA / AMF — 2026-09

This is an engineering compliance checklist, not legal advice.

## Current EU timing

Regulation (EU) 2023/1114 (MiCA) applies generally from 30 December 2024. Titles III and IV for asset-referenced and e-money tokens applied from 30 June 2024.

The MiCA transitional regime for crypto-asset service providers reached its EU end point on 1 July 2026. ESMA stated in June 2026 that unauthorised CASPs should wind down EU activities after the transition.

Official sources:
- EUR-Lex Regulation (EU) 2023/1114: https://eur-lex.europa.eu/eli/reg/2023/1114
- ESMA MiCA transition statement (23 June 2026): https://www.esma.europa.eu/sites/default/files/2026-06/ESMA75-113276571-1710_Public_Statement_MiCA_transitional_period_ends.pdf
- AMF MiCA thematic dossier: https://www.amf-france.org/fr/actualites-publications/dossiers-thematiques/mica

## France

AMF public guidance states that the French PSAN regime was replaced by the MiCA PSCA regime, with the French transition ending on 30 June 2026.

By September 2026, a project intending to provide regulated crypto-asset services in France must not assume that legacy PSAN registration is sufficient.

## 3BC classification questions

Before any testnet with external users — and again before any real-value launch — qualified French/EU counsel must determine:

1. Is 3BC a crypto-asset under MiCA?
2. Could its design qualify as:
   - an asset-referenced token;
   - an e-money token;
   - another crypto-asset;
   - or fall outside a particular MiCA category?
3. Who is the issuer / offeror?
4. Is there an offer to the public or admission to trading?
5. Is a crypto-asset white paper required?
6. Which marketing-communication rules apply?
7. Does 3B provide one or more crypto-asset services, such as:
   - custody/administration;
   - transfer;
   - exchange;
   - execution of orders;
   - trading platform operation;
   - advice or portfolio management?
8. Would 3B therefore need PSCA authorisation, or could an external authorised PSCA perform regulated services?
9. What AML/CFT, Travel Rule, sanctions, tax and accounting duties apply?
10. What consumer disclosures and complaints procedures are required?
11. What age/minor restrictions are appropriate?
12. Which jurisdictions outside France/EU must be geofenced or separately reviewed?

## Architecture consequences

Engineering must not lock the product into a regulated-service model accidentally.

Before launch choose explicitly between:
- non-transferable game entitlement;
- real crypto-asset without custody by 3B;
- token on established network with authorised external custody/exchange providers;
- 3B-provided custody/transfer/exchange;
- dedicated 3B network.

Each choice has materially different legal/security obligations.

## Mainnet legal gate

Mainnet remains BLOCKED until there is a signed legal memorandum covering at minimum:
- token classification;
- issuer obligations;
- white-paper obligations;
- service-provider/PSCA analysis;
- custody model;
- AML/CFT responsibilities;
- Travel Rule;
- tax/accounting treatment;
- user disclosures;
- market-abuse controls where applicable;
- incident/reporting duties;
- jurisdiction distribution policy.

## Operational evidence required

Store:
- legal opinion version/date;
- final token economics version;
- final protocol/smart-contract hash;
- white-paper version if applicable;
- authorised service-provider agreements;
- regulator/authorisation references if applicable;
- product jurisdictions;
- compliance owner and review cadence.

## Security rule

Legal approval does not replace security approval, and security approval does not replace legal approval.

Both Gate 4 (independent security assurance) and Gate 5 (legal/mainnet decision) must pass independently.
