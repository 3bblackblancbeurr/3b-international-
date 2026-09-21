# Monde du 3B — Unreal Engine 5.8 foundation

This folder is the high-end game client for the Monde du 3B. The existing React/Capacitor application remains the ecosystem shell: account, Passeport 3B, shop, community, sport, AI, manga, XP and entry point.

## Current foundation

- UE 5.8 project and Game/Editor targets.
- Third-person C++ character prepared for Enhanced Input.
- Gameplay Ability System on PlayerState.
- Replicated attributes: Health, Stamina, Focus and Resonance.
- 8 country/resonance gameplay tags.
- Data-driven territory definition asset.
- App 3B -> one-time launch ticket -> Unreal redemption bridge.
- Supabase service-only launch/session tables with RLS enabled.
- Production Edge Functions:
  - world-unreal-launch: authenticated app-side ticket creation.
  - world-unreal-redeem: one-time native redemption.
- The long-lived Unreal API is intentionally not active yet. Mutating gameplay authority remains on the existing trusted backend until the dedicated-server contract is validated.

## First editor steps

Text source code and config can be versioned from Git. Binary Unreal assets must be created in the Editor.

1. Install Unreal Engine 5.8 and a supported Visual Studio toolchain.
2. Open ThreeBWorld.uproject and let Unreal generate project files.
3. Compile the Editor target.
4. Create an Open World map for the France vertical slice so World Partition, Data Layers and HLOD are available from the start.
5. Create BP_ThreeBCharacter derived from AThreeBCharacter.
6. Assign a skeletal mesh, animation blueprint and the Enhanced Input mapping context/actions for Move, Look and Jump.
7. Create DA_ThreeBWorldDefinition from UThreeBWorldDefinition and enter the eight canonical territories.
8. Keep the packaged client feature flag disabled in the web app until an installer registers the threebworld:// protocol.

## Non-negotiable security rules

- Never ship SUPABASE_SERVICE_ROLE_KEY in Unreal.
- Never put a refresh token or reusable Supabase access token in a protocol URL.
- Launch tickets are one-time and short-lived.
- The same Supabase user_id remains the canonical player identity.
- Global XP, inventory, economy and cross-device progress must remain server-authoritative.
