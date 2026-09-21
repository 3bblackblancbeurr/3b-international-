"""Read-only Unreal Editor validator for the canonical France Gold Master contract.

Run from Unreal Editor Python after the target assets have been created.
This script never creates, saves, renames or deletes Unreal assets.
"""
from __future__ import annotations

import json
from pathlib import Path

import unreal


FRANCE_DATA = Path(__file__).resolve().parents[1] / "Data" / "France"
MANIFEST = FRANCE_DATA / "france-editor-asset-manifest.json"
LAYOUT = FRANCE_DATA / "france-blockout-layout.json"
CONTRACT_FILES = (
    "france-justice-v1.json",
    "france-blockout-layout.json",
    "france-checkpoint-reconnect-v1.json",
    "france-npc-dialogue-v1.json",
    "france-presentation-v1.json",
    "france-nexus-handoff-v1.json",
    "france-coop-session-v1.json",
    "celiane-state-tree-spec.json",
    "france-editor-execution-plan-v1.json",
)


def _validate_layout(layout: dict) -> list[str]:
    errors: list[str] = []
    districts = layout.get("districts", [])
    bands = layout.get("altitude_bands", [])
    zones = layout.get("zones", [])
    masses = layout.get("world_masses", [])
    cavities = layout.get("cavities", [])
    islands = layout.get("floating_islands", [])
    vistas = layout.get("vistas", [])
    hydro = layout.get("hydrology", {})
    gates = layout.get("qa_gates", {})

    if len(districts) != 8:
        errors.append(f"district_count={len(districts)} expected=8")
    if len({item.get("id") for item in districts}) != len(districts):
        errors.append("district ids are not unique")
    if len(bands) < 8:
        errors.append(f"altitude_band_count={len(bands)} expected>=8")

    district_ids = {item.get("id") for item in districts}
    band_ids = {item.get("id") for item in bands}
    for zone in zones:
        if "z" not in zone.get("location_cm", {}):
            errors.append(f"zone {zone.get('id')} has no z")
        if zone.get("district_id") not in district_ids:
            errors.append(f"zone {zone.get('id')} has unknown district")
        if zone.get("altitude_band") not in band_ids:
            errors.append(f"zone {zone.get('id')} has unknown altitude band")

    mass_kinds = {item.get("kind") for item in masses}
    if not {"underside", "underside_spine"} & mass_kinds:
        errors.append("no underside world mass")
    if len(cavities) < 4:
        errors.append(f"cavity_count={len(cavities)} expected>=4")
    if len(islands) < 5:
        errors.append(f"floating_island_count={len(islands)} expected>=5")
    if len(vistas) < 5:
        errors.append(f"vista_count={len(vistas)} expected>=5")
    if not any(item.get("id") == "under_france" for item in vistas):
        errors.append("missing under_france vista")

    waterfalls = hydro.get("waterfalls", [])
    if not hydro.get("origin_chain"):
        errors.append("hydrology origin chain missing")
    if not waterfalls:
        errors.append("no waterfall in hydrology")
    for waterfall in waterfalls:
        top = waterfall.get("top_cm", {})
        bottom = waterfall.get("bottom_cm", {})
        if float(top.get("z", 0)) <= float(bottom.get("z", 0)):
            errors.append(f"waterfall {waterfall.get('id')} does not descend")

    required_gates = (
        "no_flat_platform",
        "playable_underside",
        "three_altitudes_visible_from_vistas",
        "waterfall_has_origin",
        "side_view_must_show_thickness",
    )
    for key in required_gates:
        if gates.get(key) is not True:
            errors.append(f"qa gate {key} is not enabled")
    return errors


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    layout = json.loads(LAYOUT.read_text(encoding="utf-8"))

    missing_contracts: list[str] = []
    mismatched_contracts: list[str] = []
    contract_errors: list[str] = []

    for filename in CONTRACT_FILES:
        path = FRANCE_DATA / filename
        if not path.is_file():
            missing_contracts.append(filename)
            continue
        contract = json.loads(path.read_text(encoding="utf-8"))
        contract_slice = contract.get("slice_id")
        if contract_slice is not None and contract_slice != data["slice_id"]:
            mismatched_contracts.append(f"{filename}:{contract_slice}")

    contract_errors.extend(_validate_layout(layout))

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
    unreal.log(
        "[3B France] vertical contract="
        f"{len(layout.get('districts', []))} districts, "
        f"{len(layout.get('world_masses', []))} world masses, "
        f"{len(layout.get('floating_islands', []))} floating islands, "
        f"{len(layout.get('vistas', []))} vistas"
    )

    for filename in missing_contracts:
        unreal.log_error(f"[3B France] missing contract: {filename}")
    for item in mismatched_contracts:
        unreal.log_error(f"[3B France] contract slice mismatch: {item}")
    for item in contract_errors:
        unreal.log_error(f"[3B France] invalid vertical contract: {item}")
    for path in missing_dirs:
        unreal.log_warning(f"[3B France] missing directory: {path}")
    for path in missing_assets:
        unreal.log_error(f"[3B France] missing asset: {path}")

    if missing_contracts or mismatched_contracts or contract_errors or missing_assets or missing_dirs:
        raise RuntimeError(
            "France Gold Master incomplete: "
            f"{len(missing_contracts)} missing contracts, "
            f"{len(mismatched_contracts)} mismatched contracts, "
            f"{len(contract_errors)} vertical contract errors, "
            f"{len(missing_assets)} missing assets, "
            f"{len(missing_dirs)} missing directories."
        )

    unreal.log("[3B France] Gold Master editor asset contract OK")


if __name__ == "__main__":
    main()
