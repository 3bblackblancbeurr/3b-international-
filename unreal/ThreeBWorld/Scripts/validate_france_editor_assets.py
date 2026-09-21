"""Read-only Unreal Editor validator for the France vertical-slice asset contract.

Run from Unreal Editor Python after the target assets have been created.
This script does not create or modify assets.
"""
from __future__ import annotations

import json
from pathlib import Path

import unreal


MANIFEST = Path(__file__).resolve().parents[1] / "Data" / "France" / "france-editor-asset-manifest.json"


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
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

    for path in missing_dirs:
        unreal.log_warning(f"[3B France] missing directory: {path}")
    for path in missing_assets:
        unreal.log_error(f"[3B France] missing asset: {path}")

    if missing_assets or missing_dirs:
        raise RuntimeError(
            f"France vertical slice incomplete: {len(missing_assets)} missing assets, "
            f"{len(missing_dirs)} missing directories."
        )

    unreal.log("[3B France] editor asset contract OK")


if __name__ == "__main__":
    main()
