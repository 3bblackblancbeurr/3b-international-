"""Generate a reversible France vertical-slice blockout in the currently open UE5.8 level.

Prerequisite: create/open /Game/3B/World/France/Maps/L_France_OpenWorld as an Open World
map in Unreal Editor first. This script does not create World Partition itself.

All generated actors receive the 3B_FRANCE_BLOCKOUT tag and can be safely regenerated.
"""
from __future__ import annotations

import json
import math
import os

import unreal

TAG = unreal.Name("3B_FRANCE_BLOCKOUT")
CUBE_PATH = "/Engine/BasicShapes/Cube.Cube"


def project_file(*parts):
    return os.path.join(unreal.Paths.project_dir(), *parts)


def load_manifest():
    path = project_file("Data", "France", "france-blockout-layout.json")
    if not os.path.exists(path):
        raise RuntimeError(f"3B France manifest introuvable: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def actor_subsystem():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def mark(actor, label):
    actor.set_actor_label(label)
    actor.tags = list(actor.tags) + [TAG]
    return actor


def remove_previous_generated():
    subsystem = actor_subsystem()
    removed = 0
    for actor in subsystem.get_all_level_actors():
        if TAG in list(actor.tags):
            subsystem.destroy_actor(actor)
            removed += 1
    unreal.log(f"3B France blockout: {removed} anciens actors supprimés")


def spawn_cube(label, x, y, z, sx, sy, sz, yaw=0.0):
    subsystem = actor_subsystem()
    actor = subsystem.spawn_actor_from_class(
        unreal.StaticMeshActor,
        unreal.Vector(float(x), float(y), float(z)),
        unreal.Rotator(0.0, float(yaw), 0.0),
        transient=False,
    )
    if not actor:
        raise RuntimeError(f"Impossible de créer {label}")
    cube = unreal.load_asset(CUBE_PATH)
    if not cube:
        raise RuntimeError(f"Cube moteur introuvable: {CUBE_PATH}")
    actor.static_mesh_component.set_static_mesh(cube)
    actor.set_actor_scale3d(
        unreal.Vector(
            max(0.01, float(sx) / 100.0),
            max(0.01, float(sy) / 100.0),
            max(0.01, float(sz) / 100.0),
        )
    )
    return mark(actor, label)


def spawn_marker(label, x, y, story_phase):
    subsystem = actor_subsystem()
    actor = subsystem.spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(float(x), float(y), 100.0),
        unreal.Rotator(0.0, 0.0, 0.0),
        transient=False,
    )
    if not actor:
        raise RuntimeError(f"Impossible de créer le marqueur {label}")
    mark(actor, label)
    actor.tags = list(actor.tags) + [unreal.Name(f"3B_PHASE_{story_phase.upper()}")]
    return actor


def road_transform(a, b, width):
    dx = float(b["x"] - a["x"])
    dy = float(b["y"] - a["y"])
    length = math.hypot(dx, dy)
    return (
        (float(a["x"]) + float(b["x"])) * 0.5,
        (float(a["y"]) + float(b["y"])) * 0.5,
        length,
        float(width),
        math.degrees(math.atan2(dy, dx)),
    )


def build():
    manifest = load_manifest()
    zones = {zone["id"]: zone for zone in manifest["zones"]}
    remove_previous_generated()

    for zone in manifest["zones"]:
        p = zone["location_cm"]
        spawn_marker(
            f"3B_FR_ZONE_{zone['id']}",
            p["x"],
            p["y"],
            zone["story_phase"],
        )

    for road in manifest["roads"]:
        a = zones[road["from"]]["location_cm"]
        b = zones[road["to"]]["location_cm"]
        x, y, length, width, yaw = road_transform(a, b, road["width_cm"])
        spawn_cube(f"3B_FR_ROAD_{road['id']}", x, y, 10.0, length, width, 20.0, yaw)

    for mass in manifest["masses"]:
        zone = zones[mass["zone"]]["location_cm"]
        offset = mass["offset_cm"]
        size = mass["size_cm"]
        spawn_cube(
            f"3B_FR_MASS_{mass['id']}",
            zone["x"] + offset["x"],
            zone["y"] + offset["y"],
            float(size["z"]) * 0.5,
            size["x"],
            size["y"],
            size["z"],
        )

    unreal.log(
        "3B France blockout terminé: "
        f"{len(manifest['zones'])} zones, "
        f"{len(manifest['roads'])} liaisons, "
        f"{len(manifest['masses'])} masses."
    )


if __name__ == "__main__":
    build()
