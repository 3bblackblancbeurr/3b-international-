"""Create and validate real Hub/France maps for the native exploration prototype.

Run after compiling ThreeBWorldEditor, using UnrealEditor-Cmd -run=pythonscript
-script=<this file>. Generated Content assets are the actual deliverable, not a
declaration that the art, campaign, multiplayer or AAA release is finished.
"""
import importlib.util
import json
import os
import unreal

HUB = "/Game/3binternational/Maps/Hub3B_Main_V05"
FRANCE = "/Game/3B/World/France/Maps/L_France_OpenWorld"
TAG = unreal.Name("3B_NATIVE_EXPLORATION")
REPORT = os.path.join(unreal.Paths.project_saved_dir(), "Validation", "native-exploration.json")


def module(name):
    path = os.path.join(unreal.Paths.project_dir(), "Scripts", name + ".py")
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def actor(cls, name, position, rotation=None):
    result = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).spawn_actor_from_class(
        cls, unreal.Vector(*position), rotation or unreal.Rotator(), transient=False)
    if not result:
        raise RuntimeError("Could not spawn " + name)
    result.set_actor_label(name)
    result.tags = list(result.tags) + [TAG]
    # Traversal endpoints and PlayerStarts must exist before the player streams a cell.
    result.set_editor_property("is_spatially_loaded", False)
    return result


def prepare_world(start):
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    for previous in actors.get_all_level_actors():
        if TAG in list(previous.tags):
            actors.destroy_actor(previous)
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    world.get_world_settings().set_editor_property("default_game_mode", unreal.ThreeBGameMode)
    actor(unreal.PlayerStart, "Native_PlayerStart", start)
    actor(unreal.DirectionalLight, "Native_Sun", (0, 0, 50000), unreal.Rotator(-35, -25, 0))
    actor(unreal.SkyLight, "Native_SkyLight", (0, 0, 50000))
    actor(unreal.SkyAtmosphere, "Native_Atmosphere", (0, 0, 0))
    # Each arrival has an explicit collision surface rather than a non-gameplay marker.
    floor = actor(unreal.StaticMeshActor, "Native_ArrivalGround", (start[0], start[1], start[2] - 120))
    floor.static_mesh_component.set_static_mesh(unreal.load_asset("/Engine/BasicShapes/Cube.Cube"))
    floor.set_actor_scale3d(unreal.Vector(24, 24, .3))
    floor.static_mesh_component.set_collision_profile_name("BlockAll")


def portal(name, position, destination, label):
    result = actor(unreal.ThreeBExplorationPortal, name, position, unreal.Rotator(0, 180, 0))
    result.set_editor_property("destination_map", unreal.Name(destination))
    result.set_editor_property("portal_label", label)
    # Re-run construction after setting editable native properties.
    result.set_actor_transform(result.get_actor_transform(), False, True)
    return result


def save_and_check(path):
    level = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    if not level.save_current_level():
        raise RuntimeError("Could not save " + path)
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
    starts = [a for a in actors if isinstance(a, unreal.PlayerStart)]
    doors = [a for a in actors if isinstance(a, unreal.ThreeBExplorationPortal)]
    if len(starts) != 1 or not doors:
        raise RuntimeError("Missing native PlayerStart or portals in " + path)
    return {"map": path, "actors": len(actors), "player_starts": len(starts),
            "native_portals": len(doors), "saved": unreal.EditorAssetLibrary.does_asset_exist(path)}


def main():
    report = {"status": "FAILED", "scope": "native exploration prototype", "maps": []}
    try:
        hub = module("build_hub3b_main_v5")
        hub.build()
        prepare_world((0, 4200, 180))
        portal("Native_France_FastTravel", (700, 4200, 160), FRANCE, "E - France / Justice")
        portal("Native_France_CanonicalGate", (-22000, -24000, 1060), FRANCE, "E - France / Justice")
        report["maps"].append(save_and_check(HUB))

        hub.open_or_create_level(FRANCE, "L_France_OpenWorld")
        module("build_france_blockout").build()
        prepare_world((-26000, 0, 12200))
        portal("Native_Return_Hub", (-25300, 0, 12180), HUB, "E - Retour Cite des Huit Heritages")
        report["maps"].append(save_and_check(FRANCE))
        unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level(HUB)
        report["status"] = "PASS"
        unreal.log("3B_NATIVE_EXPLORATION_ASSETS_PASS")
    except Exception as exc:
        report["error"] = str(exc)
        raise
    finally:
        os.makedirs(os.path.dirname(REPORT), exist_ok=True)
        with open(REPORT, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2)


if __name__ == "__main__":
    main()
