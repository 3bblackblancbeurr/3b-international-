"""Read-only Unreal Editor validator for the France vertical-slice asset contract.

Run from Unreal Editor Python after the target assets have been created.
This script does not create or modify assets.
"""
from __future__ import annotations

import json
from pathlib import Path

import unreal


FRANCE_DATA = Path(__file__).resolve().parents[1] / "Data" / "France"
MANIFEST = FRANCE_DATA / "france-editor-asset-manifest.json"
CONTRACT_FILES = (
    "france-justice-v1.json",
    "france-checkpoint-reconnect-v1.json",
    "france-npc-dialogue-v1.json",
    "france-presentation-v1.json",
    "france-nexus-handoff-v1.json",
    "france-coop-session-v1.json",
    "celiane-state-tree-spec.json",
    "france-editor-execution-plan-v1.json",
)


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    missing_contracts: list[str] = []
    mismatched_contracts: list[str] = []
    for filename in CONTRACT_FILES:
        path = FRANCE_DATA / filename
        if not path.is_file():
            missing_contracts.append(filename)
            continue
        contract = json.loads(path.read_text(encoding="utf-8"))
        contract_slice = contract.get("slice_id")
        if contract_slice is not None and contract_slice != data["slice_id"]:
            mismatched_contracts.append(f"{filename}:{contract_slice}")

    missing_assets: list[str] = []
    missing_dirs: list[str] = []

    for entry in data["required_assets"]:
        path = entry["path"]
        if not unreal.EditorAssetLibrary.does_asset_exist(path):
            missing_assets.append(path)

    for path in data["directories"]:
        if not unreal.EditorAssetLibrary.does_directory_exist(path):
            missing_dirs.append(path)

    unreal.log(f"[3B France] contract={data['slice_id']} engine-target={data['engine']}")
    unreal.log(f"[3B France] required assets={len(data['required_assets'])}")
    unreal.log(f"[3B France] versioned contracts={len(CONTRACT_FILES)}")

    for filename in missing_contracts:
        unreal.log_error(f"[3B France] missing contract: {filename}")
    for item in mismatched_contracts:
        unreal.log_error(f"[3B France] contract slice mismatch: {item}")
    for path in missing_dirs:
        unreal.log_warning(f"[3B France] missing directory: {path}")
    for path in missing_assets:
        unreal.log_error(f"[3B France] missing asset: {path}")

    if missing_contracts or mismatched_contracts or missing_assets or missing_dirs:
        raise RuntimeError(
            "France vertical slice incomplete: "
            f"{len(missing_contracts)} missing contracts, "
            f"{len(mismatched_contracts)} mismatched contracts, "
            f"{len(missing_assets)} missing assets, "
            f"{len(missing_dirs)} missing directories."
        )

    unreal.log("[3B France] editor asset contract OK")


if __name__ == "__main__":
    main()
