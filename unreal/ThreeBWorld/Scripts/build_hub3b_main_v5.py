import json
import math
import os
import traceback
import unreal

MANIFEST_REL = os.path.join("Data", "Production", "hub3b-main-v5.json")
CUBE_PATH = "/Engine/BasicShapes/Cube.Cube"
CYLINDER_PATH = "/Engine/BasicShapes/Cylinder.Cylinder"
MATERIAL_FOLDER = "/Game/3binternational/HubV5/Materials"


def log(message):
    unreal.log(f"[3B HUB V5] {message}")


def warn(message):
    unreal.log_warning(f"[3B HUB V5] {message}")


def project_file(*parts):
    return os.path.join(unreal.Paths.project_dir(), *parts)


def load_json(*parts):
    path = project_file(*parts)
    if not os.path.exists(path):
        raise RuntimeError(f"Fichier Hub V5 introuvable: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def actor_subsystem():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def level_subsystem():
    return unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def editor_subsystem():
    return unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)


def ensure_directory(path):
    try:
        unreal.EditorAssetLibrary.make_directory(path)
    except Exception:
        pass


def current_level_name():
    world = editor_subsystem().get_editor_world()
    if world is None:
        return ""
    try:
        return str(unreal.GameplayStatics.get_current_level_name(world, True))
    except Exception:
        return ""


def open_or_create_level(asset_path, required_name):
    ensure_directory(asset_path.rsplit("/", 1)[0])
    subsystem = level_subsystem()
    exists = False
    try:
        exists = bool(unreal.EditorAssetLibrary.does_asset_exist(asset_path))
    except Exception:
        pass
    if exists:
        if not subsystem.load_level(asset_path):
            raise RuntimeError(f"Impossible de charger {asset_path}")
    else:
        if not subsystem.new_level(asset_path, True):
            raise RuntimeError(f"Impossible de créer {asset_path}")
    if current_level_name() != required_name:
        raise RuntimeError(
            f"SÉCURITÉ: map active '{current_level_name() or 'inconnue'}' au lieu de '{required_name}'."
        )


def mark(actor, label, tag, folder):
    actor.set_actor_label(label)
    try:
        actor.tags = list(actor.tags) + [unreal.Name(tag)]
        actor.set_folder_path(unreal.Name(folder))
    except Exception:
        pass
    return actor


def destroy_previous(tag):
    tag_name = unreal.Name(tag)
    removed = 0
    for actor in actor_subsystem().get_all_level_actors():
        try:
            if tag_name in list(actor.tags):
                actor_subsystem().destroy_actor(actor)
                removed += 1
        except Exception:
            pass
    log(f"{removed} ancien(s) acteur(s) V5 supprimé(s)")


def load_mesh(path):
    mesh = unreal.load_asset(path)
    if not mesh:
        raise RuntimeError(f"Mesh moteur introuvable: {path}")
    return mesh


def assign_material(actor, material):
    if material:
        try:
            actor.static_mesh_component.set_material(0, material)
        except Exception:
            pass


def spawn_mesh(label, mesh_path, location, scale, rotation, tag, folder, material=None):
    actor = actor_subsystem().spawn_actor_from_class(
        unreal.StaticMeshActor,
        unreal.Vector(*[float(value) for value in location]),
        unreal.Rotator(*[float(value) for value in rotation]),
        transient=False,
    )
    if not actor:
        raise RuntimeError(f"Impossible de créer {label}")
    actor.static_mesh_component.set_static_mesh(load_mesh(mesh_path))
    actor.set_actor_scale3d(unreal.Vector(*[max(0.01, float(value)) for value in scale]))
    assign_material(actor, material)
    return mark(actor, label, tag, folder)


def spawn_box(label, location, size_cm, yaw, tag, folder, material=None):
    return spawn_mesh(
        label, CUBE_PATH, location,
        [float(size_cm[0]) / 100.0, float(size_cm[1]) / 100.0, float(size_cm[2]) / 100.0],
        [0.0, float(yaw), 0.0], tag, folder, material
    )


def spawn_cylinder(label, location, diameter_cm, height_cm, tag, folder, material=None):
    return spawn_mesh(
        label, CYLINDER_PATH, location,
        [float(diameter_cm) / 100.0, float(diameter_cm) / 100.0, float(height_cm) / 100.0],
        [0.0, 0.0, 0.0], tag, folder, material
    )


def create_material(name, base_rgb, metallic=0.0, roughness=0.5, emissive_rgb=None):
    ensure_directory(MATERIAL_FOLDER)
    asset_path = f"{MATERIAL_FOLDER}/{name}"
    existing = unreal.load_asset(asset_path)
    if existing:
        return existing
    try:
        tools = unreal.AssetToolsHelpers.get_asset_tools()
        material = tools.create_asset(name, MATERIAL_FOLDER, unreal.Material, unreal.MaterialFactoryNew())
        if not material:
            return None
        base = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant3Vector, -500, -100
        )
        base.set_editor_property("constant", unreal.LinearColor(*base_rgb, 1.0))
        unreal.MaterialEditingLibrary.connect_material_property(base, "", unreal.MaterialProperty.MP_BASE_COLOR)
        metal = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant, -500, 50
        )
        metal.set_editor_property("r", metallic)
        unreal.MaterialEditingLibrary.connect_material_property(metal, "", unreal.MaterialProperty.MP_METALLIC)
        rough = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant, -500, 180
        )
        rough.set_editor_property("r", roughness)
        unreal.MaterialEditingLibrary.connect_material_property(rough, "", unreal.MaterialProperty.MP_ROUGHNESS)
        if emissive_rgb:
            emissive = unreal.MaterialEditingLibrary.create_material_expression(
                material, unreal.MaterialExpressionConstant3Vector, -500, 320
            )
            emissive.set_editor_property("constant", unreal.LinearColor(*emissive_rgb, 1.0))
            unreal.MaterialEditingLibrary.connect_material_property(emissive, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR)
        unreal.MaterialEditingLibrary.recompile_material(material)
        unreal.EditorAssetLibrary.save_loaded_asset(material)
        return material
    except Exception as exc:
        warn(f"Matériau {name} non créé: {exc}")
        return None


def materials():
    return {
        "black": create_material("M_HubV5_Black", [0.012, 0.018, 0.028], .72, .34),
        "gold": create_material("M_HubV5_Gold", [.62, .42, .16], .88, .24),
        "blue": create_material("M_HubV5_MatrixBlue", [0.0, .08, .18], .25, .18, [0.0, 2.4, 8.0]),
        "water": create_material("M_HubV5_Water", [0.0, .05, .10], .15, .12, [0.0, .35, .9]),
    }


def road_transform(road):
    a, b = road["from_cm"], road["to_cm"]
    dx, dy = float(b["x"] - a["x"]), float(b["y"] - a["y"])
    length = math.hypot(dx, dy)
    return (
        (float(a["x"]) + float(b["x"])) * .5,
        (float(a["y"]) + float(b["y"])) * .5,
        length,
        float(road.get("width_cm", 1200)),
        math.degrees(math.atan2(dy, dx)),
    )


def spawn_city(layout, manifest, tag, mats):
    for zone in manifest.get("water_zones", []):
        spawn_box(
            f"HUB_V5_WATER_{zone['id']}",
            zone["center_cm"],
            zone["size_cm"],
            0,
            tag,
            "HUB_3B_V5/WATER",
            mats["water"],
        )

    for district in layout["districts"]:
        p = district["location_cm"]
        spawn_cylinder(
            f"HUB_V5_DISTRICT_{district['id']}",
            [p["x"], p["y"], 35],
            1250 if district["id"] not in ("heritage_square", "broken_circle_tower") else 1800,
            70,
            tag,
            "HUB_3B_V5/DISTRICTS",
            mats["gold"] if district["tier"] == 0 else mats["blue"],
        )

    for road in layout["roads"]:
        x, y, length, width, yaw = road_transform(road)
        material = mats["gold"] if road["kind"] == "express" else mats["black"]
        spawn_box(
            f"HUB_V5_ROAD_{road['id']}",
            [x, y, 12],
            [length, width, 24],
            yaw,
            tag,
            "HUB_3B_V5/ROADS",
            material,
        )

    for building in layout["buildings"]:
        p, size = building["location_cm"], building["footprint_cm"]
        spawn_box(
            f"HUB_V5_BUILDING_{building['id']}",
            [p["x"], p["y"], float(size["z"]) * .5],
            [size["x"], size["y"], size["z"]],
            0,
            tag,
            "HUB_3B_V5/BUILDINGS",
            mats["black"],
        )
        spawn_box(
            f"HUB_V5_BUILDING_GOLD_{building['id']}",
            [p["x"], p["y"], float(size["z"]) + 30],
            [max(180, float(size["x"]) * .42), max(140, float(size["y"]) * .42), 60],
            0,
            tag,
            "HUB_3B_V5/BUILDING_LIGHTS",
            mats["gold"],
        )


def spawn_gate(gate, manifest, tag, mats):
    p = gate["location_cm"]
    x, y = float(p["x"]), float(p["y"])
    yaw = math.degrees(math.atan2(-y, -x))
    arch = manifest["gate_arch"]
    opening_w = float(arch["opening_width_cm"])
    opening_h = float(arch["opening_height_cm"])
    pillar_w = float(arch["pillar_width_cm"])
    depth = float(arch["depth_cm"])
    beam_h = float(arch["beam_height_cm"])
    rad = math.radians(yaw)
    sx, sy = -math.sin(rad), math.cos(rad)

    for side, sign in (("L", -1), ("R", 1)):
        offset = (opening_w * .5 + pillar_w * .5) * sign
        spawn_box(
            f"HUB_V5_GATE_{gate['code']}_{side}",
            [x + sx * offset, y + sy * offset, opening_h * .5],
            [pillar_w, depth, opening_h],
            yaw,
            tag,
            "HUB_3B_V5/GATES",
            mats["black"],
        )

    spawn_box(
        f"HUB_V5_GATE_{gate['code']}_TOP",
        [x, y, opening_h + beam_h * .5],
        [opening_w + pillar_w * 2, depth, beam_h],
        yaw,
        tag,
        "HUB_3B_V5/GATES",
        mats["gold"],
    )
    spawn_box(
        f"HUB_V5_GATE_{gate['code']}_ENERGY",
        [x, y, opening_h * .5],
        [opening_w, float(arch["energy_depth_cm"]), opening_h * .9],
        yaw,
        tag,
        "HUB_3B_V5/GATES",
        mats["blue"],
    )

    approach = float(arch["approach_length_cm"])
    fx, fy = math.cos(rad), math.sin(rad)
    spawn_box(
        f"HUB_V5_GATE_{gate['code']}_APPROACH",
        [x + fx * approach * .5, y + fy * approach * .5, 18],
        [approach, 900, 36],
        yaw,
        tag,
        "HUB_3B_V5/GATE_APPROACHES",
        mats["black"],
    )


def validate(layout, manifest, tag):
    tag_name = unreal.Name(tag)
    labels = []
    for actor in actor_subsystem().get_all_level_actors():
        try:
            if tag_name in list(actor.tags):
                labels.append(actor.get_actor_label())
        except Exception:
            pass
    expected = manifest["validation"]
    counts = {
        "districts": len([x for x in labels if x.startswith("HUB_V5_DISTRICT_")]),
        "buildings": len([x for x in labels if x.startswith("HUB_V5_BUILDING_") and "GOLD_" not in x]),
        "gates": len([x for x in labels if x.endswith("_ENERGY") and x.startswith("HUB_V5_GATE_")]),
        "roads": len([x for x in labels if x.startswith("HUB_V5_ROAD_")]),
    }
    for key in ("districts", "buildings", "gates", "roads"):
        if counts[key] != int(expected[key]):
            raise RuntimeError(f"VALIDATION V5: {key}={counts[key]} attendu={expected[key]}")
    if current_level_name() != manifest["required_map_name"]:
        raise RuntimeError("VALIDATION V5: mauvaise map active")
    for gate in layout["gates"]:
        p = gate["location_cm"]
        radius = math.hypot(float(p["x"]), float(p["y"]))
        if radius < float(expected["min_outer_gate_radius_cm"]):
            raise RuntimeError(f"VALIDATION V5: porte {gate['code']} trop proche du centre")
    log(
        f"VALIDATION HUB V5 OK — {counts['districts']} quartiers, {counts['buildings']} bâtiments, "
        f"{counts['gates']} Portes dispersées, {counts['roads']} axes."
    )


def build():
    manifest = load_json("Data", "Production", "hub3b-main-v5.json")
    layout = load_json("Data", "Production", "world-layout-unreal.json")
    open_or_create_level(manifest["map_asset"], manifest["required_map_name"])
    destroy_previous(manifest["generated_tag"])
    mats = materials()
    spawn_city(layout, manifest, manifest["generated_tag"], mats)
    for gate in layout["gates"]:
        spawn_gate(gate, manifest, manifest["generated_tag"], mats)
    validate(layout, manifest, manifest["generated_tag"])
    if not level_subsystem().save_current_level():
        raise RuntimeError("Échec sauvegarde Hub3B_Main_V05")
    log("Cité des Huit Héritages V5 construite et sauvegardée.")


if __name__ == "__main__":
    try:
        build()
    except Exception:
        unreal.log_error("[3B HUB V5] ERREUR FATALE:\n" + traceback.format_exc())
        raise
