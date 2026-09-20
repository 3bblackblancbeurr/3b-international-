import json
import math
import os
import unreal

TAG = unreal.Name("3B_GENERATED_BLOCKOUT")
CUBE_PATH = "/Engine/BasicShapes/Cube.Cube"


def project_file(*parts):
    return os.path.join(unreal.Paths.project_dir(), *parts)


def load_manifest():
    path = project_file("Data", "Production", "world-layout-unreal.json")
    if not os.path.exists(path):
        raise RuntimeError(f"3B manifest introuvable: {path}")
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
    unreal.log(f"3B blockout: {removed} anciens actors supprimés")


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


def spawn_marker(label, x, y):
    subsystem = actor_subsystem()
    actor = subsystem.spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(float(x), float(y), 100.0),
        unreal.Rotator(0.0, 0.0, 0.0),
        transient=False,
    )
    if not actor:
        raise RuntimeError(f"Impossible de créer le marqueur {label}")
    return mark(actor, label)


def road_transform(road):
    a = road["from_cm"]
    b = road["to_cm"]
    dx = float(b["x"] - a["x"])
    dy = float(b["y"] - a["y"])
    length = math.hypot(dx, dy)
    x = (float(a["x"]) + float(b["x"])) * 0.5
    y = (float(a["y"]) + float(b["y"])) * 0.5
    yaw = math.degrees(math.atan2(dy, dx))
    width = 1700.0 if road.get("kind") == "express" else 1200.0
    return x, y, length, width, yaw


def build():
    manifest = load_manifest()
    remove_previous_generated()

    for district in manifest["districts"]:
        p = district["location_cm"]
        spawn_marker(
            f"3B_DISTRICT_{district['id']}",
            p["x"],
            p["y"],
        )

    for road in manifest["roads"]:
        x, y, length, width, yaw = road_transform(road)
        spawn_cube(
            f"3B_ROAD_{road['id']}",
            x,
            y,
            10.0,
            length,
            width,
            20.0,
            yaw,
        )

    for building in manifest["buildings"]:
        p = building["location_cm"]
        size = building["footprint_cm"]
        spawn_cube(
            f"3B_BUILDING_{building['id']}",
            p["x"],
            p["y"],
            float(size["z"]) * 0.5,
            size["x"],
            size["y"],
            size["z"],
        )

    for gate in manifest["gates"]:
        p = gate["location_cm"]
        spawn_cube(
            f"3B_GATE_{gate['id']}",
            p["x"],
            p["y"],
            600.0,
            900.0,
            300.0,
            1200.0,
        )

    unreal.log(
        "3B blockout terminé: "
        f"{len(manifest['districts'])} quartiers, "
        f"{len(manifest['roads'])} routes, "
        f"{len(manifest['buildings'])} bâtiments, "
        f"{len(manifest['gates'])} portes."
    )


if __name__ == "__main__":
    build()
