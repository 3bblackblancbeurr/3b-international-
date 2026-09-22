"""Strict France Gold Master evidence gate for Unreal Editor 5.8.

PREPARED never counts as validated. Gold Master is true only when every
required gate has real PASS evidence.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
from typing import Any

import unreal

TARGET_MAP = "/Game/3B/World/France/Maps/L_France_OpenWorld"
PROJECT_DIR = Path(unreal.Paths.project_dir())
DATA_DIR = PROJECT_DIR / "Data" / "France"
ASSET_MANIFEST = DATA_DIR / "france-editor-asset-manifest.json"
GATE_MANIFEST = DATA_DIR / "france-goldmaster-gates-v1.json"
SAVED_DIR = Path(unreal.Paths.project_saved_dir()) / "3B" / "FranceGoldMaster"
EVIDENCE_DIR = SAVED_DIR / "Evidence"
REPORT_PATH = SAVED_DIR / "france_goldmaster_report.json"
BLOCKOUT_TAG = "3B_FRANCE_BLOCKOUT"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def result(gate_id: str, status: str, summary: str, details=None, evidence=None):
    return {
        "id": gate_id,
        "status": status,
        "summary": summary,
        "details": details or {},
        "evidence": evidence or [],
    }


def reflected_name(obj: Any) -> str:
    if obj is None:
        return ""
    try:
        return str(obj.get_class().get_name())
    except Exception:
        return type(obj).__name__


def editor_world():
    try:
        subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
        world = subsystem.get_editor_world() if subsystem else None
        if world:
            return world
    except Exception:
        pass

    legacy = getattr(unreal, "EditorLevelLibrary", None)
    if legacy and hasattr(legacy, "get_editor_world"):
        try:
            return legacy.get_editor_world()
        except Exception:
            pass
    return None


def package_name(obj: Any) -> str:
    try:
        return str(obj.get_outermost().get_name())
    except Exception:
        try:
            return str(obj.get_path_name()).split(".", 1)[0]
        except Exception:
            return ""


def actors():
    try:
        subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        return list(subsystem.get_all_level_actors() or []) if subsystem else []
    except Exception:
        return []


def evidence_file(filename: str):
    path = EVIDENCE_DIR / filename
    if not path.is_file():
        return "MISSING", None
    try:
        payload = load_json(path)
    except Exception as exc:
        return "INVALID", {"path": str(path), "error": str(exc)}
    status = str(payload.get("status", "")).upper()
    if status not in {"PASS", "FAIL"}:
        return "INVALID", payload
    return status, payload


def check_engine():
    try:
        version = str(unreal.SystemLibrary.get_engine_version())
    except Exception as exc:
        return result("engine_5_8", "BLOCKED", "Cannot read Unreal version.", {"error": str(exc)})
    if version.startswith("5.8"):
        return result("engine_5_8", "PASS", f"Unreal Engine {version} detected.")
    return result("engine_5_8", "FAIL", f"Expected Unreal 5.8, detected {version}.")


def check_map():
    world = editor_world()
    if not world:
        return result("target_map_open", "BLOCKED", "No Editor world available.")
    current = package_name(world)
    if current == TARGET_MAP:
        return result("target_map_open", "PASS", "Canonical France map is open.", {"map": current})
    return result(
        "target_map_open",
        "FAIL",
        "Wrong map is open.",
        {"expected": TARGET_MAP, "current": current},
    )


def check_assets(manifest):
    missing = []
    mismatched = []
    checked = 0
    for entry in manifest.get("required_assets", []):
        path = str(entry["path"])
        expected = str(entry.get("kind", ""))
        if not unreal.EditorAssetLibrary.does_asset_exist(path):
            missing.append(path)
            continue
        checked += 1
        try:
            asset = unreal.EditorAssetLibrary.load_asset(path)
            actual = reflected_name(asset)
        except Exception as exc:
            mismatched.append({"path": path, "expected": expected, "actual": f"LOAD_ERROR:{exc}"})
            continue

        compatible = (
            not expected
            or expected.lower() in actual.lower()
            or (expected == "Blueprint" and "Blueprint" in actual)
        )
        if not compatible:
            mismatched.append({"path": path, "expected": expected, "actual": actual})

    if missing or mismatched:
        return result(
            "required_editor_assets",
            "FAIL",
            "Required Unreal assets are missing or mismatched.",
            {"checked_existing": checked, "missing": missing, "type_mismatches": mismatched},
        )
    return result(
        "required_editor_assets",
        "PASS",
        "All required Unreal assets exist with compatible reflected types.",
        {"count": checked},
    )


def check_directories(manifest):
    missing = [
        path for path in manifest.get("directories", [])
        if not unreal.EditorAssetLibrary.does_directory_exist(path)
    ]
    if missing:
        return result(
            "required_editor_directories",
            "FAIL",
            "Required France directories are missing.",
            {"missing": missing},
        )
    return result(
        "required_editor_directories",
        "PASS",
        "All required France directories exist.",
        {"count": len(manifest.get("directories", []))},
    )


def check_world_partition():
    world = editor_world()
    probes = []
    if world:
        getter = getattr(world, "get_world_partition", None)
        if callable(getter):
            try:
                value = getter()
                probes.append({"probe": "get_world_partition", "type": reflected_name(value)})
                if value:
                    return result(
                        "world_partition_enabled",
                        "PASS",
                        "World Partition object detected.",
                        {"probe": probes[-1]},
                    )
            except Exception as exc:
                probes.append({"probe": "get_world_partition", "error": str(exc)})

        try:
            value = world.get_editor_property("world_partition")
            probes.append({"probe": "world_partition property", "type": reflected_name(value)})
            if value:
                return result(
                    "world_partition_enabled",
                    "PASS",
                    "World Partition property detected.",
                    {"probe": probes[-1]},
                )
        except Exception as exc:
            probes.append({"probe": "world_partition property", "error": str(exc)})

    status, payload = evidence_file("world_partition.json")
    if status == "PASS":
        return result(
            "world_partition_enabled",
            "PASS",
            "World Partition commandlet evidence accepted.",
            {"probes": probes, "evidence": payload},
            [str(EVIDENCE_DIR / "world_partition.json")],
        )
    if status == "FAIL":
        return result(
            "world_partition_enabled",
            "FAIL",
            "World Partition commandlet evidence reports failure.",
            {"probes": probes, "evidence": payload},
            [str(EVIDENCE_DIR / "world_partition.json")],
        )
    return result(
        "world_partition_enabled",
        "BLOCKED",
        "World Partition not yet proven through reflection or commandlet evidence.",
        {"probes": probes, "evidence_status": status},
    )


def check_vertical_foundation():
    all_actors = actors()
    tagged = 0
    weather_directors = 0
    for actor in all_actors:
        try:
            tags = {str(tag) for tag in list(actor.tags)}
        except Exception:
            tags = set()
        if BLOCKOUT_TAG in tags:
            tagged += 1
        if "ThreeBWeatherDirector" in reflected_name(actor):
            weather_directors += 1

    if tagged == 0:
        return result(
            "vertical_foundation",
            "FAIL",
            "Canonical France blockout actors are absent.",
            {"actor_count": len(all_actors), "weather_directors": weather_directors},
        )
    return result(
        "vertical_foundation",
        "PREPARED",
        "Vertical blockout exists; this is preparation, not final AAA geometry.",
        {
            "actor_count": len(all_actors),
            "blockout_actor_count": tagged,
            "weather_directors": weather_directors,
        },
    )


def check_external_gate(gate):
    gate_id = str(gate["id"])
    filename = str(gate.get("evidence_file", "")).strip()
    if not filename:
        return result(
            gate_id,
            "BLOCKED",
            "No automatic proof or evidence file is mapped for this gate.",
            {"proof_type": gate.get("proof_type")},
        )

    status, payload = evidence_file(filename)
    path = str(EVIDENCE_DIR / filename)
    if status == "MISSING":
        return result(
            gate_id,
            "BLOCKED",
            f"Real evidence is missing: {filename}.",
            {"proof_type": gate.get("proof_type"), "evidence_path": path},
        )
    if status == "INVALID":
        return result(gate_id, "FAIL", f"Invalid evidence file: {filename}.", payload or {}, [path])

    expected_engine = str(gate.get("engine", "5.8"))
    if payload and expected_engine and not str(payload.get("engine", "")).startswith(expected_engine):
        return result(
            gate_id,
            "FAIL",
            f"Evidence {filename} was not produced by UE {expected_engine}.",
            {"payload": payload},
            [path],
        )

    if status == "PASS":
        return result(gate_id, "PASS", f"Real evidence accepted: {filename}.", payload or {}, [path])
    return result(gate_id, "FAIL", f"Real evidence reports failure: {filename}.", payload or {}, [path])


def run():
    SAVED_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

    manifest = load_json(ASSET_MANIFEST)
    gates = load_json(GATE_MANIFEST)

    checks = [
        check_engine(),
        check_map(),
        check_assets(manifest),
        check_directories(manifest),
        check_world_partition(),
        check_vertical_foundation(),
    ]

    builtin_ids = {item["id"] for item in checks}
    for gate in gates.get("gates", []):
        if gate["id"] not in builtin_ids:
            checks.append(check_external_gate(gate))

    by_id = {item["id"]: item for item in checks}
    required_ids = [
        str(gate["id"]) for gate in gates.get("gates", [])
        if gate.get("required", True)
    ]
    missing_results = [gate_id for gate_id in required_ids if gate_id not in by_id]
    blocking = [
        by_id[gate_id] for gate_id in required_ids
        if gate_id in by_id and by_id[gate_id]["status"] != "PASS"
    ]

    gold_master = not missing_results and not blocking
    report = {
        "schema_version": "1.0.0",
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "engine_target": "5.8",
        "slice_id": manifest.get("slice_id"),
        "target_map": TARGET_MAP,
        "gold_master": gold_master,
        "status": "GOLD_MASTER_VALIDATED" if gold_master else "NOT_GOLD_MASTER",
        "checks": checks,
        "missing_gate_results": missing_results,
        "blocking_gate_ids": [item["id"] for item in blocking],
        "evidence_root": str(EVIDENCE_DIR),
        "rule": "Gold Master is true only when every required gate has real PASS evidence.",
    }

    with REPORT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)

    unreal.log(f"[3B France] evidence report: {REPORT_PATH}")
    if gold_master:
        unreal.log("[3B France] FRANCE GOLD MASTER VALIDATED BY ALL REQUIRED EVIDENCE GATES")
    else:
        unreal.log_warning(
            "[3B France] NOT GOLD MASTER — blocking gates: "
            + ", ".join(report["blocking_gate_ids"])
        )
    return report


def main():
    report = run()
    if not report["gold_master"]:
        raise RuntimeError(f"France Gold Master incomplete; see {REPORT_PATH}")


if __name__ == "__main__":
    main()
