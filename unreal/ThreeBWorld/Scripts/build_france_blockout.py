"""Generate the canonical France Gold Master vertical blockout in the open UE5.8 level.

Prerequisite: create/open /Game/3B/World/France/Maps/L_France_OpenWorld as an Open World map.
The script is intentionally reversible: every generated actor carries 3B_FRANCE_BLOCKOUT.
It creates blockout geometry/markers only; it does not claim final art, World Partition cells,
Data Layers, Water assets, Niagara systems or navigation have been authored.
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


def mark(actor, label, extra_tags=()):
    actor.set_actor_label(label)
    tags = list(actor.tags)
    for tag in (TAG, *[unreal.Name(str(x)) for x in extra_tags]):
        if tag not in tags:
            tags.append(tag)
    actor.tags = tags
    return actor


def remove_previous_generated():
    subsystem = actor_subsystem()
    removed = 0
    for actor in subsystem.get_all_level_actors():
        if TAG in list(actor.tags):
            subsystem.destroy_actor(actor)
            removed += 1
    unreal.log(f"3B France blockout: {removed} anciens actors supprimés")


def spawn_cube(label, x, y, z, sx, sy, sz, pitch=0.0, yaw=0.0, roll=0.0, tags=()):
    subsystem = actor_subsystem()
    actor = subsystem.spawn_actor_from_class(
        unreal.StaticMeshActor,
        unreal.Vector(float(x), float(y), float(z)),
        unreal.Rotator(float(pitch), float(yaw), float(roll)),
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
    return mark(actor, label, tags)


def spawn_marker(label, location, tags=()):
    subsystem = actor_subsystem()
    actor = subsystem.spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(
            float(location.get("x", 0.0)),
            float(location.get("y", 0.0)),
            float(location.get("z", 0.0)),
        ),
        unreal.Rotator(0.0, 0.0, 0.0),
        transient=False,
    )
    if not actor:
        raise RuntimeError(f"Impossible de créer le marqueur {label}")
    return mark(actor, label, tags)


def disable_collision(actor):
    try:
        actor.static_mesh_component.set_collision_enabled(unreal.CollisionEnabled.NO_COLLISION)
    except Exception as exc:
        unreal.log_warning(f"3B France: collision non désactivée sur {actor.get_actor_label()}: {exc}")
    return actor


def spawn_cavity_frame(cavity):
    p, s = cavity["location_cm"], cavity["size_cm"]
    x, y, z = float(p["x"]), float(p["y"]), float(p["z"])
    sx, sy, sz = float(s["x"]), float(s["y"]), float(s["z"])
    wall = max(120.0, min(sx, sy) * 0.035)
    tag = f"3B_CAVITY_{cavity['kind'].upper()}"
    actors = [
        spawn_cube(f"3B_FR_CAVITY_{cavity['id']}_W", x-sx*.5, y, z, wall, sy, sz, tags=("3B_CAVITY_SHELL", tag)),
        spawn_cube(f"3B_FR_CAVITY_{cavity['id']}_E", x+sx*.5, y, z, wall, sy, sz, tags=("3B_CAVITY_SHELL", tag)),
        spawn_cube(f"3B_FR_CAVITY_{cavity['id']}_N", x, y+sy*.5, z, sx, wall, sz, tags=("3B_CAVITY_SHELL", tag)),
        spawn_cube(f"3B_FR_CAVITY_{cavity['id']}_S", x, y-sy*.5, z, sx, wall, sz, tags=("3B_CAVITY_SHELL", tag)),
        spawn_cube(f"3B_FR_CAVITY_{cavity['id']}_CEILING", x, y, z+sz*.5, sx, sy, wall, tags=("3B_CAVITY_SHELL", tag)),
    ]
    return actors


def segment_transform(a, b):
    dx = float(b["x"] - a["x"])
    dy = float(b["y"] - a["y"])
    dz = float(b.get("z", 0.0) - a.get("z", 0.0))
    horizontal = math.hypot(dx, dy)
    length = math.sqrt(horizontal * horizontal + dz * dz)
    return (
        (float(a["x"]) + float(b["x"])) * 0.5,
        (float(a["y"]) + float(b["y"])) * 0.5,
        (float(a.get("z", 0.0)) + float(b.get("z", 0.0))) * 0.5,
        length,
        -math.degrees(math.atan2(dz, max(horizontal, 1.0))),
        math.degrees(math.atan2(dy, dx)),
    )


def spawn_segment(label, a, b, width, thickness, tags=()):
    x, y, z, length, pitch, yaw = segment_transform(a, b)
    return spawn_cube(label, x, y, z, length, width, thickness, pitch, yaw, 0.0, tags)


def build():
    manifest = load_manifest()
    zones = {zone["id"]: zone for zone in manifest["zones"]}
    remove_previous_generated()

    # 1) Mass first: surface, cliffs, stacked plateaus and underside.
    for mass in manifest.get("world_masses", []):
        p = mass["location_cm"]
        s = mass["size_cm"]
        spawn_cube(
            f"3B_FR_WORLD_{mass['id']}",
            p["x"], p["y"], p["z"],
            s["x"], s["y"], s["z"],
            tags=("3B_WORLD_MASS", f"3B_MASS_{mass['kind'].upper()}"),
        )

    # 2) District and story anchors preserve the existing canonical story graph.
    for district in manifest.get("districts", []):
        spawn_marker(
            f"3B_FR_DISTRICT_{district['id']}",
            district["location_cm"],
            ("3B_DISTRICT", f"3B_ALT_{district['altitude_band'].upper()}"),
        )

    for zone in manifest["zones"]:
        spawn_marker(
            f"3B_FR_ZONE_{zone['id']}",
            zone["location_cm"],
            (
                f"3B_PHASE_{zone['story_phase'].upper()}",
                f"3B_DISTRICT_{zone['district_id'].upper()}",
                f"3B_ALT_{zone['altitude_band'].upper()}",
            ),
        )

    # 3) Roads and explicit vertical links are true 3D segments, not flat XY slabs.
    for road in manifest["roads"]:
        spawn_segment(
            f"3B_FR_ROAD_{road['id']}",
            zones[road["from"]]["location_cm"],
            zones[road["to"]]["location_cm"],
            road["width_cm"],
            24.0,
            ("3B_ROUTE",),
        )

    for link in manifest.get("vertical_links", []):
        spawn_segment(
            f"3B_FR_VERTICAL_{link['id']}",
            zones[link["from"]]["location_cm"],
            zones[link["to"]]["location_cm"],
            link["width_cm"],
            30.0,
            ("3B_VERTICAL_LINK", f"3B_LINK_{link['kind'].upper()}"),
        )

    # 4) Building/program masses sit on each zone elevation.
    for mass in manifest.get("masses", []):
        zone = zones[mass["zone"]]["location_cm"]
        offset = mass["offset_cm"]
        size = mass["size_cm"]
        base_z = float(zone.get("z", 0.0)) + float(offset.get("z", 0.0))
        spawn_cube(
            f"3B_FR_BUILDING_{mass['id']}",
            zone["x"] + offset["x"],
            zone["y"] + offset["y"],
            base_z + float(size["z"]) * 0.5,
            size["x"], size["y"], size["z"],
            tags=("3B_BUILDING_MASS", f"3B_SCALE_{mass['category'].upper()}"),
        )

    # 5) Underworld/cavity blockout now has visible hollow shells plus semantic markers.
    # Final subtractive/Nanite cave art is still an Editor/final-art task.
    for cavity in manifest.get("cavities", []):
        spawn_marker(
            f"3B_FR_CAVITY_{cavity['id']}",
            cavity["location_cm"],
            ("3B_CAVITY", f"3B_CAVITY_{cavity['kind'].upper()}"),
        )
        spawn_cavity_frame(cavity)

    # 6) Floating islands use layered blockout masses to avoid a single-box silhouette.
    islands = {entry["id"]: entry for entry in manifest.get("floating_islands", [])}
    for island in islands.values():
        p = island["location_cm"]
        s = island["size_cm"]
        sx, sy, sz = float(s["x"]), float(s["y"]), float(s["z"])
        layers = (
            (0.00, 0.00, 0.00, 1.00, 1.00, .42),
            (.08, -.05, -.32, .82, .76, .34),
            (-.10, .07, -.62, .58, .52, .28),
        )
        for layer_index, (ox, oy, oz, scale_x, scale_y, scale_z) in enumerate(layers):
            spawn_cube(
                f"3B_FR_ISLAND_{island['id']}_L{layer_index+1}",
                p["x"] + sx * ox,
                p["y"] + sy * oy,
                p["z"] + sz * oz,
                sx * scale_x,
                sy * scale_y,
                max(220.0, sz * scale_z),
                yaw=(layer_index * 13.0 + len(island["id"]) * 7.0) % 31.0 - 15.0,
                tags=("3B_FLOATING_ISLAND", "3B_LAYERED_ISLAND", f"3B_ISLAND_{island['purpose'].upper()}"),
            )

    # Physical blockout routes make the lower world readable and reviewable.
    zone_locations = {key: value["location_cm"] for key, value in zones.items()}
    district_locations = {entry["id"]: entry["location_cm"] for entry in manifest.get("districts", [])}
    for route in manifest.get("void_system", {}).get("island_routes", []):
        start = zone_locations.get(route.get("from")) or district_locations.get(route.get("from"))
        if route.get("from_island") in islands:
            start = islands[route["from_island"]]["location_cm"]
        end = zone_locations.get(route.get("to")) or district_locations.get(route.get("to"))
        if route.get("to_island") in islands:
            end = islands[route["to_island"]]["location_cm"]
        if not start or not end:
            unreal.log_warning(f"3B France: route vide non résolue {route['id']}")
            continue
        spawn_segment(
            f"3B_FR_VOID_ROUTE_{route['id']}",
            start,
            end,
            manifest.get("void_system", {}).get("island_rules", {}).get("route_width_cm", 500),
            35.0,
            ("3B_VOID_ROUTE", f"3B_ROUTE_{route['kind'].upper()}"),
        )

    # 7) Hydrology blockout: logical source -> river -> basin -> waterfall -> lower basin.
    hydro = manifest.get("hydrology", {})
    for source in hydro.get("source_markers", []):
        spawn_marker(
            f"3B_FR_WATER_SOURCE_{source['id']}",
            source["location_cm"],
            ("3B_WATER", "3B_WATER_SOURCE"),
        )

    for segment in hydro.get("horizontal_segments", []):
        spawn_segment(
            f"3B_FR_WATER_{segment['id']}",
            segment["from"],
            segment["to"],
            segment["width_cm"],
            segment["depth_cm"],
            ("3B_WATER", "3B_WATER_FLOW"),
        )

    for basin in hydro.get("basins", []):
        p = basin["location_cm"]
        s = basin["size_cm"]
        spawn_cube(
            f"3B_FR_BASIN_{basin['id']}",
            p["x"], p["y"], p["z"],
            s["x"], s["y"], s["z"],
            tags=("3B_WATER", "3B_WATER_BASIN"),
        )

    for waterfall in hydro.get("waterfalls", []):
        spawn_segment(
            f"3B_FR_WATERFALL_{waterfall['id']}",
            waterfall["top_cm"],
            waterfall["bottom_cm"],
            waterfall["width_cm"],
            waterfall["thickness_cm"],
            ("3B_WATER", "3B_WATERFALL"),
        )

    # 8) Void depth preview: cloud ocean + fall/recovery proof anchors.
    void_system = manifest.get("void_system", {})
    cloud = void_system.get("cloud_ocean")
    if cloud:
        p, s = cloud["center_cm"], cloud["size_cm"]
        cloud_actor = spawn_cube(
            "3B_FR_VOID_CLOUD_OCEAN",
            p["x"], p["y"], p["z"],
            s["x"], s["y"], s["z"],
            tags=("3B_VOID", "3B_CLOUD_OCEAN", "3B_PRESENTATION_ONLY"),
        )
        if cloud.get("collision") is False:
            disable_collision(cloud_actor)

    recovery = void_system.get("fall_recovery", {})
    if recovery:
        spawn_marker(
            "3B_FR_VOID_SOFT_RECOVERY",
            {"x": 0, "y": 0, "z": recovery["soft_recovery_z_cm"]},
            ("3B_VOID", "3B_SOFT_RECOVERY"),
        )
        spawn_marker(
            "3B_FR_VOID_HARD_FAIL",
            {"x": 0, "y": 0, "z": recovery["hard_fail_z_cm"]},
            ("3B_VOID", "3B_HARD_FAIL"),
        )

    # 9) Directed vista anchors define the required anti-flat review positions.
    for vista in manifest.get("vistas", []):
        spawn_marker(
            f"3B_FR_VISTA_{vista['id']}",
            vista["location_cm"],
            ("3B_VISTA", f"3B_LANDMARK_{vista['landmark'].upper()}"),
        )
        spawn_marker(
            f"3B_FR_VISTA_TARGET_{vista['id']}",
            vista["target_cm"],
            ("3B_VISTA_TARGET",),
        )

    unreal.log(
        "[3B France] vertical blockout generated: "
        f"{len(manifest.get('districts', []))} districts, "
        f"{len(manifest['zones'])} story zones, "
        f"{len(manifest.get('world_masses', []))} world masses, "
        f"{len(manifest.get('masses', []))} building masses, "
        f"{len(manifest.get('floating_islands', []))} floating islands, "
        f"{len(hydro.get('waterfalls', []))} waterfalls, "
        f"{len(manifest.get('vistas', []))} vistas."
    )


if __name__ == "__main__":
    build()
