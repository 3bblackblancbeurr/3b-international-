# Monde du 3B — Unreal Engine 5.8

> **Projet Unreal canonique : `unreal/ThreeBWorld`.**
> Le dossier voisin `unreal/3BWorld` est gelé comme source de migration historique et ne doit plus recevoir de nouveau gameplay/runtime.

This folder is the high-end game client for the Monde du 3B. The existing React/Capacitor application remains the ecosystem shell: account, Passeport 3B, shop, community, sport, AI, manga, XP and entry point.

## Current foundation

- UE 5.8 project with Client, Server and Editor targets.
- Third-person C++ character prepared for Enhanced Input.
- Gameplay Ability System on PlayerState.
- Replicated attributes: Health, Stamina, Focus and Resonance.
- 8 country/resonance gameplay tags.
- Data-driven territory definition asset.
- App 3B -> one-time launch ticket -> Unreal redemption bridge.
- Supabase service-only launch/session tables with RLS enabled.
- Production Edge Functions:
  - `world-unreal-launch`: authenticated app-side ticket creation.
  - `world-unreal-redeem`: one-time native redemption.
- The long-lived Unreal API remains read-only candidate code until the dedicated-server authority contract is validated.
- Canonical mirrors, schemas and production manifests now live under `Data/`.
- Preproduction tooling lives under `Scripts/`.
- Historical production planning documents are preserved under `Docs/Production/` and `Docs/Legacy/`.

## Security boundary

- Never ship `SUPABASE_SERVICE_ROLE_KEY` in Unreal.
- Never put a refresh token or reusable Supabase access token in a protocol URL.
- The custom protocol carries only a short-lived, one-time ticket.
- The Unreal client ignores any API-host override from a deep link.
- Ticket redemption is pinned to the configured production 3B Supabase origin.
- The same Supabase `user_id` remains the canonical player identity.
- Global XP, inventory, economy, mission validation and cross-device progress remain server-authoritative.

## First editor steps

Text source code and config can be versioned from Git. Binary Unreal assets must be created and validated in Unreal Editor.

1. Install Unreal Engine 5.8 and a supported Visual Studio toolchain.
2. Open `ThreeBWorld.uproject` and generate project files.
3. Compile the Editor target, then Client and Server targets.
4. Create an Open World map for the France vertical slice so World Partition, Data Layers and HLOD are available from the start.
5. Create `BP_ThreeBCharacter` derived from `AThreeBCharacter`.
6. Assign skeletal mesh, animation blueprint and Enhanced Input mappings for Move, Look and Jump.
7. Create `DA_ThreeBWorldDefinition` from `UThreeBWorldDefinition` and enter the eight canonical territories.
8. Import/translate the versioned manifests from `Data/Production/` into real Unreal assets.
9. Keep the packaged-client feature flag disabled until a signed installer registers the `threebworld://` protocol and the native bridge passes end-to-end tests.

See `Docs/CONSOLIDATION_STATUS.md` and `Docs/FRANCE_VERTICAL_SLICE.md`.
