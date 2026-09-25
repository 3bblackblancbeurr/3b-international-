# Edge Function Security Classification

## Principle

Gateway JWT should be enabled whenever every caller is authenticated by Supabase JWT.

When an endpoint intentionally supports unauthenticated registration, public read data, or third-party webhooks, verify_jwt=false may be necessary — but the function must enforce its own trust boundary.

## Current inventory

| Function | Gateway JWT | Classification | Current protection | Target |
| --- | --- | --- | --- | --- |
| world-engine | true | private | gateway JWT + session validation | keep |
| world-engine-goldmaster-candidate | true | private | gateway JWT | keep / retire after rollout |
| city-3b | true | private | gateway JWT + auth.uid | keep |
| card-arena | true | private | gateway JWT | keep |
| marketplace-3b | true | private | gateway JWT | keep |
| delete-account | true | private | gateway JWT | keep |
| member-hub | false | mixed | register/recover public; private actions authenticate bearer + session | split public auth from private member API |
| ecosystem | false | mixed | GET sports/capabilities public; POST uses bearer + session | split public read API from private ecosystem API |
| secret3b-claim | false | private-with-custom-auth | explicit bearer getUser | move to gateway JWT after caller compatibility is proven |
| secret3b-phone | false | webhook/public | Twilio signature verification | keep gateway false; webhook signature is trust boundary |

## Migration order

1. Add new public endpoints without removing old routes.
2. Update clients.
3. Observe production logs/errors.
4. Turn private endpoints gateway JWT=true.
5. Remove deprecated mixed route only after callers are confirmed migrated.

Do not flip gateway JWT on mixed endpoints in place without migrating public callers first.
