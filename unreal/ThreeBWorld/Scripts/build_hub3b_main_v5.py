import json
import math
import os
import zlib
import unreal

MANIFEST_REL = os.path.join("Data", "Production", "hub3b-main-v5-premium.json")
LAYOUT_REL = os.path.join("Data", "Production", "world-layout-unreal.json")
CANON_REL = os.path.join("src", "world", "hub", "data", "hub-master-plan-v2.json")

CUBE_PATH = "/Engine/BasicShapes/Cube.Cube"
CYLINDER_PATH = "/Engine/BasicShapes/Cylinder.Cylinder"
SPHERE_PATH = "/Engine/BasicShapes/Sphere.Sphere"
MATERIAL_FOLDER = "/Game/3binternational/HubV5/Materials"


def log(message):
    unreal.log(f"[3B HUB V5] {message}")


def warn(message):
    unreal.log_warning(f"[3B HUB V5] {message}")


def project_file(*parts):
    return os.path.join(unreal.Paths.project_dir(), *parts)


def repo_file(*parts):
    return os.path.normpath(os.path.join(unreal.Paths.project_dir(), "..", "..", *parts))


def load_json(path):
    if not os.path.exists(path):
        raise RuntimeError(f"Fichier introuvable: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def load_sources():
    manifest = load_json(project_file(*MANIFEST_REL.split(os.sep)))
    layout = load_json(project_file(*LAYOUT_REL.split(os.sep)))
    canon = load_json(repo_file(*CANON_REL.split(os.sep)))
    return manifest, layout, canon


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
    try:
        exists = bool(unreal.EditorAssetLibrary.does_asset_exist(asset_path))
    except Exception:
        exists = False

    if exists:
        log(f"Chargement de la map V5: {asset_path}")
        if not subsystem.load_level(asset_path):
            raise RuntimeError(f"Impossible de charger {asset_path}")
    else:
        log(f"Création de la map V5 World Partition: {asset_path}")
        if not subsystem.new_level(asset_path, True):
            raise RuntimeError(f"Impossible de créer {required_name}")

    actual = current_level_name()
    if actual != required_name:
        raise RuntimeError(
            f"SÉCURITÉ: map active '{actual or 'inconnue'}' au lieu de '{required_name}'. Construction annulée."
        )
    log(f"Map V5 confirmée: {actual}")


def mark(actor, label, tag, folder):
    actor.set_actor_label(label)
    try:
        actor.tags = list(actor.tags) + [unreal.Name(tag)]
    except Exception:
        pass
    try:
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
            continue
    log(f"{removed} ancien(s) acteur(s) V5 supprimé(s)")


def load_mesh(path):
    mesh = unreal.load_asset(path)
    if not mesh:
        raise RuntimeError(f"Mesh moteur introuvable: {path}")
    return mesh


def assign_material(actor, material):
    if not material:
        return
    try:
        actor.static_mesh_component.set_material(0, material)
    except Exception:
        pass


def spawn_mesh(label, mesh_path, center, scale, rotation, tag, folder, material=None):
    actor = actor_subsystem().spawn_actor_from_class(
        unreal.StaticMeshActor,
        unreal.Vector(float(center[0]), float(center[1]), float(center[2])),
        unreal.Rotator(float(rotation[0]), float(rotation[1]), float(rotation[2])),
        transient=False,
    )
    if not actor:
        raise RuntimeError(f"Impossible de créer {label}")
    actor.static_mesh_component.set_static_mesh(load_mesh(mesh_path))
    actor.set_actor_scale3d(
        unreal.Vector(float(scale[0]), float(scale[1]), float(scale[2]))
    )
    assign_material(actor, material)
    return mark(actor, label, tag, folder)


def spawn_box(label, center, size_cm, yaw_deg, tag, folder, material=None, pitch_deg=0.0):
    return spawn_mesh(
        label,
        CUBE_PATH,
        center,
        [
            max(0.01, float(size_cm[0]) / 100.0),
            max(0.01, float(size_cm[1]) / 100.0),
            max(0.01, float(size_cm[2]) / 100.0),
        ],
        [float(pitch_deg), float(yaw_deg), 0.0],
        tag,
        folder,
        material,
    )


def spawn_cylinder(label, center, diameter_cm, depth_cm, tag, folder, material=None):
    return spawn_mesh(
        label,
        CYLINDER_PATH,
        center,
        [
            max(0.01, float(diameter_cm) / 100.0),
            max(0.01, float(diameter_cm) / 100.0),
            max(0.01, float(depth_cm) / 100.0),
        ],
        [0.0, 0.0, 0.0],
        tag,
        folder,
        material,
    )


def spawn_sphere(label, center, diameter_cm, tag, folder, material=None):
    scale = max(0.01, float(diameter_cm) / 100.0)
    return spawn_mesh(
        label,
        SPHERE_PATH,
        center,
        [scale, scale, scale],
        [0.0, 0.0, 0.0],
        tag,
        folder,
        material,
    )


def spawn_target(label, center, tag, folder):
    actor = actor_subsystem().spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(float(center[0]), float(center[1]), float(center[2])),
        unreal.Rotator(0.0, 0.0, 0.0),
        transient=False,
    )
    if not actor:
        raise RuntimeError(f"Impossible de créer {label}")
    return mark(actor, label, tag, folder)


def create_material(name, base_rgb, metallic=0.0, roughness=0.5, emissive_rgb=None):
    ensure_directory(MATERIAL_FOLDER)
    asset_path = f"{MATERIAL_FOLDER}/{name}"
    try:
        existing = unreal.load_asset(asset_path)
        if existing:
            return existing
    except Exception:
        pass

    try:
        tools = unreal.AssetToolsHelpers.get_asset_tools()
        material = tools.create_asset(name, MATERIAL_FOLDER, unreal.Material, unreal.MaterialFactoryNew())
        if not material:
            return None

        base = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant3Vector, -500, -100
        )
        base.set_editor_property(
            "constant",
            unreal.LinearColor(float(base_rgb[0]), float(base_rgb[1]), float(base_rgb[2]), 1.0),
        )
        unreal.MaterialEditingLibrary.connect_material_property(
            base, "", unreal.MaterialProperty.MP_BASE_COLOR
        )

        metal = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant, -500, 60
        )
        metal.set_editor_property("r", float(metallic))
        unreal.MaterialEditingLibrary.connect_material_property(
            metal, "", unreal.MaterialProperty.MP_METALLIC
        )

        rough = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant, -500, 190
        )
        rough.set_editor_property("r", float(roughness))
        unreal.MaterialEditingLibrary.connect_material_property(
            rough, "", unreal.MaterialProperty.MP_ROUGHNESS
        )

        if emissive_rgb is not None:
            emissive = unreal.MaterialEditingLibrary.create_material_expression(
                material, unreal.MaterialExpressionConstant3Vector, -500, 320
            )
            emissive.set_editor_property(
                "constant",
                unreal.LinearColor(
                    float(emissive_rgb[0]), float(emissive_rgb[1]), float(emissive_rgb[2]), 1.0
                ),
            )
            unreal.MaterialEditingLibrary.connect_material_property(
                emissive, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR
            )

        unreal.MaterialEditingLibrary.recompile_material(material)
        unreal.EditorAssetLibrary.save_loaded_asset(material)
        return material
    except Exception as exc:
        warn(f"Matériau {name} non créé automatiquement: {exc}")
        return None


def hex_rgb(value):
    value = str(value or "#00a8ff").lstrip("#")
    if len(value) != 6:
        value = "00a8ff"
    return [int(value[i:i+2], 16) / 255.0 for i in (0, 2, 4)]


def create_materials(manifest):
    materials = {
        "black": create_material("M_HubV5_Black", [0.012, 0.018, 0.028], .72, .34),
        "stone": create_material("M_HubV5_Stone", [0.13, 0.16, 0.18], .08, .78),
        "wet_stone": create_material("M_HubV5_WetStone", [0.08, 0.11, 0.13], .18, .26),
        "gold": create_material("M_HubV5_ChampagneGold", [0.62, 0.42, 0.16], .88, .24),
        "blue": create_material("M_HubV5_MatrixBlue", [0.0, .06, .14], .25, .16, [0.0, 2.4, 8.0]),
        "glass": create_material("M_HubV5_GlassTech", [.03, .15, .22], .28, .13, [0.0, .22, .48]),
        "water": create_material("M_HubV5_Water", [.01, .10, .16], .12, .08, [0.0, .12, .30]),
        "green": create_material("M_HubV5_Garden", [.08, .19, .12], .04, .76),
        "wood": create_material("M_HubV5_Wood", [.14, .08, .04], .02, .72),
        "white": create_material("M_HubV5_WhiteStone", [.56, .58, .56], .06, .54),
        "copper": create_material("M_HubV5_Copper", [.42, .19, .08], .66, .28),
        "jade": create_material("M_HubV5_Jade", [.07, .28, .21], .32, .28),
        "violet": create_material("M_HubV5_Violet", [.16, .05, .22], .32, .22, [.18, .03, .35]),
    }
    materials["portal"] = {}
    for portal in manifest["portals"]:
        rgb = hex_rgb(
            {
                "FR":"#7bbdff","DZ":"#8fd698","ES":"#ff9e86","MA":"#f7c77e",
                "IT":"#95e4b6","TN":"#8fd7ff","TR":"#e9a4e8","EE":"#9ce8f4"
            }.get(portal["code"], "#00a8ff")
        )
        materials["portal"][portal["code"]] = create_material(
            f"M_HubV5_{portal['code']}_Accent",
            [c * .22 for c in rgb],
            .34,
            .18,
            [c * 2.0 for c in rgb],
        )
    return materials


def district_levels(manifest):
    return manifest["verticality"]["district_levels_cm"]


def district_lookup(layout):
    return {d["id"]: d for d in layout["districts"]}


def district_z(manifest, district_id):
    return float(district_levels(manifest).get(district_id, 0.0))


def segment_transform(a, b, z_a=0.0, z_b=0.0):
    dx = float(b["x"] - a["x"])
    dy = float(b["y"] - a["y"])
    horizontal = math.hypot(dx, dy)
    dz = float(z_b - z_a)
    length = math.sqrt(horizontal * horizontal + dz * dz)
    center = [
        (float(a["x"]) + float(b["x"])) * .5,
        (float(a["y"]) + float(b["y"])) * .5,
        (float(z_a) + float(z_b)) * .5,
    ]
    yaw = math.degrees(math.atan2(dy, dx))
    pitch = -math.degrees(math.atan2(dz, max(1.0, horizontal)))
    return center, length, yaw, pitch


def district_material(district_id, materials):
    return {
        "heritage_square": materials["stone"],
        "broken_circle_tower": materials["black"],
        "archives": materials["wet_stone"],
        "arena": materials["copper"],
        "commerce": materials["gold"],
        "community": materials["jade"],
        "innovation": materials["glass"],
        "docks": materials["wet_stone"],
        "city3b_portal": materials["stone"],
        "gardens": materials["green"],
    }.get(district_id, materials["stone"])


def spawn_city_floor(manifest, layout, tag, materials):
    districts = district_lookup(layout)
    for spec in manifest["districts"]:
        district_id = spec["id"]
        p = districts[district_id]["location_cm"]
        z = district_z(manifest, district_id)
        diameter = 5200 if district_id not in ("heritage_square","broken_circle_tower") else 6800
        spawn_cylinder(
            f"HUB_V5_DISTRICT_{district_id.upper()}",
            [p["x"], p["y"], z - 75],
            diameter,
            150,
            tag,
            f"HUB_3B_V5/DISTRICTS/{district_id}",
            district_material(district_id, materials),
        )
        spawn_cylinder(
            f"HUB_V5_PLAZA_GOLD_{district_id.upper()}",
            [p["x"], p["y"], z + 10],
            diameter * .58,
            20,
            tag,
            f"HUB_3B_V5/DISTRICTS/{district_id}",
            materials["gold"] if district_id in ("heritage_square","broken_circle_tower","commerce","city3b_portal") else materials["blue"],
        )

        # Premium stepped district base: visible vertical layers without turning the Hub
        # into a flat lobby. The road ramps remain the playable links between levels.
        spawn_cylinder(
            f"HUB_V5_DISTRICT_RETENTION_{district_id.upper()}",
            [p["x"], p["y"], z - 170],
            diameter * 1.10,
            190,
            tag,
            f"HUB_3B_V5/DISTRICTS/{district_id}/TERRACE",
            materials["black"],
        )
        spawn_cylinder(
            f"HUB_V5_DISTRICT_RING_{district_id.upper()}",
            [p["x"], p["y"], z - 28],
            diameter * .86,
            34,
            tag,
            f"HUB_3B_V5/DISTRICTS/{district_id}/TERRACE",
            materials["blue"] if district_id in ("innovation","archives","docks") else materials["gold"],
        )
        for step_index in range(3):
            spawn_box(
                f"HUB_V5_DISTRICT_STEP_{district_id.upper()}_{step_index+1}",
                [p["x"], p["y"] + diameter * .42 + step_index * 220, z + 18 + step_index * 12],
                [900 + step_index * 180, 360, 90],
                0,
                tag,
                f"HUB_3B_V5/DISTRICTS/{district_id}/TERRACE/STEPS",
                materials["stone"],
            )


def spawn_roads(manifest, layout, tag, materials):
    districts = district_lookup(layout)
    for index, road in enumerate(layout["roads"]):
        parts = road["id"].split(":")
        from_id, to_id = parts[-2], parts[-1]
        z_a = district_z(manifest, from_id) if from_id in districts else 0.0
        z_b = district_z(manifest, to_id) if to_id in districts else 0.0
        center, length, yaw, pitch = segment_transform(road["from_cm"], road["to_cm"], z_a, z_b)
        width = 1500 if road.get("kind") == "express" else 1050
        spawn_box(
            f"HUB_V5_ROAD_{index:02d}",
            [center[0], center[1], center[2] - 18],
            [length, width, 36],
            yaw,
            tag,
            "HUB_3B_V5/ROADS",
            materials["wet_stone"],
            pitch_deg=pitch,
        )
        spawn_box(
            f"HUB_V5_ROAD_GUIDE_{index:02d}",
            [center[0], center[1], center[2] + 6],
            [length * .94, 28, 12],
            yaw,
            tag,
            "HUB_3B_V5/ROADS/GUIDES",
            materials["gold"] if road.get("kind") == "express" else materials["blue"],
            pitch_deg=pitch,
        )


def spawn_building_shell(label, building, z, tag, folder, materials):
    size = building["footprint_cm"]
    p = building["location_cm"]
    district = building["district"]
    height = float(size["z"])
    body_mat = district_material(district, materials)
    spawn_box(
        label,
        [p["x"], p["y"], z + height * .5],
        [size["x"], size["y"], height],
        0,
        tag,
        folder,
        body_mat,
    )
    spawn_box(
        label + "_ROOF",
        [p["x"], p["y"], z + height + 35],
        [float(size["x"]) * .76, float(size["y"]) * .76, 70],
        0,
        tag,
        folder,
        materials["gold"],
    )
    levels = max(2, min(7, int(height / 900)))
    for level in range(1, levels):
        wz = z + height * level / (levels + .2)
        spawn_box(
            label + f"_WINDOW_{level:02d}",
            [p["x"], p["y"] + float(size["y"]) * .505, wz],
            [float(size["x"]) * .66, 18, 70],
            0,
            tag,
            folder + "/WINDOWS",
            materials["glass"],
        )
    entrance = building.get("entrance_cm") or p
    spawn_box(
        label + "_ENTRANCE",
        [entrance["x"], entrance["y"], z + 45],
        [420, 420, 90],
        0,
        tag,
        folder + "/ENTRANCES",
        materials["gold"],
    )


def spawn_canonical_buildings(manifest, layout, tag, materials):
    for building in layout["buildings"]:
        z = district_z(manifest, building["district"])
        spawn_building_shell(
            f"HUB_V5_BUILDING_{building['id'].upper()}",
            building,
            z,
            tag,
            f"HUB_3B_V5/BUILDINGS/{building['district']}",
            materials,
        )


def deterministic(seed):
    return (zlib.crc32(seed.encode("utf-8")) & 0xFFFFFFFF) / 4294967295.0


def spawn_civic_fabric(manifest, layout, canon, tag, materials):
    districts = district_lookup(layout)
    uses = canon.get("civicFabric", {}).get("uses", ["housing","food","workshop","school","clinic","small_shop","guild_room","public_service"])
    per_district = int(manifest["world"]["civic_frontages_per_district"])
    for spec in manifest["districts"]:
        district_id = spec["id"]
        center = districts[district_id]["location_cm"]
        z = district_z(manifest, district_id)
        for index in range(per_district):
            seed = f"{district_id}:{index}"
            angle = index * (math.pi * (3.0 - math.sqrt(5.0))) + deterministic(seed) * .35
            radius = 6200 + (index % 4) * 1350 + deterministic(seed + ":r") * 850
            x = center["x"] + math.cos(angle) * radius
            y = center["y"] + math.sin(angle) * radius
            width = 1800 + deterministic(seed + ":w") * 1700
            depth = 1600 + deterministic(seed + ":d") * 1500
            height = 1200 + deterministic(seed + ":h") * (4200 if district_id in ("innovation","commerce","city3b_portal") else 2800)
            civic_use = uses[index % len(uses)]
            folder = f"HUB_3B_V5/CITE_ORIGINE/{district_id}/{civic_use}"
            spawn_box(
                f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_{civic_use.upper()}",
                [x, y, z + height * .5],
                [width, depth, height],
                math.degrees(angle) + 90.0,
                tag,
                folder,
                district_material(district_id, materials),
            )
            spawn_box(
                f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_SIGN",
                [x, y, z + 160],
                [520, 70, 160],
                math.degrees(angle) + 90.0,
                tag,
                folder + "/SIGNAGE",
                materials["gold"] if index % 3 == 0 else materials["blue"],
            )

            # Make the Cité Origine readable at street level: civic use changes
            # the facade silhouette instead of leaving generic decorative boxes.
            facing = math.degrees(angle) + 90.0
            if civic_use == "housing":
                for floor in (0.34, 0.58, 0.78):
                    spawn_box(
                        f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_BALCONY_{int(floor*100)}",
                        [x, y + depth * .52, z + height * floor],
                        [width * .42, 90, 80],
                        facing, tag, folder + "/IDENTITY", materials["blue"],
                    )
            elif civic_use == "food":
                spawn_box(
                    f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_AWNING",
                    [x, y + depth * .56, z + 380],
                    [width * .58, 180, 120],
                    facing, tag, folder + "/IDENTITY", materials["gold"],
                )
            elif civic_use == "workshop":
                for side in (-1, 0, 1):
                    spawn_box(
                        f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_WORKSHOP_{side+1}",
                        [x + side * width * .24, y + depth * .51, z + 260],
                        [width * .18, 110, 520],
                        facing, tag, folder + "/IDENTITY", materials["black"],
                    )
            elif civic_use == "school":
                for side in (-1, 1):
                    spawn_box(
                        f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_SCHOOL_PILLAR_{side}",
                        [x + side * width * .30, y + depth * .52, z + 420],
                        [120, 120, 760],
                        facing, tag, folder + "/IDENTITY", materials["stone"],
                    )
                spawn_box(
                    f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_SCHOOL_LINTEL",
                    [x, y + depth * .53, z + 820],
                    [width * .68, 120, 120],
                    facing, tag, folder + "/IDENTITY", materials["blue"],
                )
            elif civic_use == "clinic":
                spawn_box(
                    f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_CLINIC_H",
                    [x, y + depth * .53, z + 520],
                    [width * .28, 100, 120],
                    facing, tag, folder + "/IDENTITY", materials["blue"],
                )
                spawn_box(
                    f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_CLINIC_V",
                    [x, y + depth * .535, z + 520],
                    [120, 100, width * .28],
                    facing, tag, folder + "/IDENTITY", materials["blue"],
                )
            elif civic_use == "small_shop":
                for side in (-1, 1):
                    spawn_box(
                        f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_SHOP_WINDOW_{side}",
                        [x + side * width * .22, y + depth * .52, z + 300],
                        [width * .18, 90, 440],
                        facing, tag, folder + "/IDENTITY", materials["glass"],
                    )
            elif civic_use == "guild_room":
                for side in (-1, 1):
                    spawn_box(
                        f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_GUILD_BANNER_{side}",
                        [x + side * width * .31, y + depth * .525, z + height * .60],
                        [160, 80, height * .38],
                        facing, tag, folder + "/IDENTITY", materials["gold"],
                    )
            elif civic_use == "public_service":
                spawn_box(
                    f"HUB_V5_CIVIC_{district_id.upper()}_{index:02d}_CIVIC_CANOPY",
                    [x, y + depth * .57, z + 410],
                    [width * .62, 160, 140],
                    facing, tag, folder + "/IDENTITY", materials["gold"],
                )


def spawn_landmarks(manifest, layout, canon, tag, materials):
    districts = district_lookup(layout)
    for index, landmark in enumerate(canon.get("districtLandmarks", [])):
        district_id = landmark["district"]
        p = districts[district_id]["location_cm"]
        z = district_z(manifest, district_id)
        angle = deterministic("landmark:" + landmark["id"]) * math.tau
        distance = 0 if district_id == "broken_circle_tower" else 1800 + deterministic("distance:" + landmark["id"]) * 1200
        x = p["x"] + math.cos(angle) * distance
        y = p["y"] + math.sin(angle) * distance
        height = float(landmark.get("height", 48)) * 100.0
        mat = materials["blue"] if landmark.get("accent") == "#00a8ff" or district_id == "innovation" else materials["gold"]
        if landmark.get("archetype") == "tree":
            spawn_cylinder(f"HUB_V5_LANDMARK_{index:02d}_TRUNK", [x,y,z+height*.28], 420, height*.56, tag, "HUB_3B_V5/LANDMARKS", materials["wood"])
            spawn_sphere(f"HUB_V5_LANDMARK_{index:02d}_CROWN", [x,y,z+height*.72], 1800, tag, "HUB_3B_V5/LANDMARKS", materials["green"])
        else:
            base = max(900.0, min(2400.0, height * .16))
            spawn_cylinder(f"HUB_V5_LANDMARK_{index:02d}_BASE", [x,y,z+height*.32], base, height*.64, tag, "HUB_3B_V5/LANDMARKS", materials["black"])
            spawn_cylinder(f"HUB_V5_LANDMARK_{index:02d}_LIGHT", [x,y,z+height*.72], base*.38, height*.74, tag, "HUB_3B_V5/LANDMARKS", mat)
            spawn_sphere(f"HUB_V5_LANDMARK_{index:02d}_BEACON", [x,y,z+height+120], 360, tag, "HUB_3B_V5/LANDMARKS", materials["blue"])


def spawn_broken_circle_monument(manifest, layout, tag, materials):
    districts = district_lookup(layout)
    p = districts["broken_circle_tower"]["location_cm"]
    z = district_z(manifest, "broken_circle_tower")
    radius = 1900.0
    for index in range(8):
        angle = index * 45.0 + 8.0
        rad = math.radians(angle)
        x = p["x"] + math.cos(rad) * radius
        y = p["y"] + math.sin(rad) * radius
        spawn_box(
            f"HUB_V5_BROKEN_CIRCLE_FRAGMENT_{index+1}",
            [x, y, z + 2850 + (index % 2) * 80],
            [1050, 260, 220],
            angle + 90.0,
            tag,
            "HUB_3B_V5/BROKEN_CIRCLE",
            materials["gold"] if index % 2 == 0 else materials["blue"],
        )
    spawn_sphere(
        "HUB_V5_BROKEN_CIRCLE_HEART",
        [p["x"], p["y"], z + 2500],
        620,
        tag,
        "HUB_3B_V5/BROKEN_CIRCLE",
        materials["blue"],
    )


def inward_basis(x, y):
    length = max(1.0, math.hypot(x, y))
    inward = (-x / length, -y / length)
    side = (-inward[1], inward[0])
    return inward, side


def spawn_portals(manifest, tag, materials):
    for portal in manifest["portals"]:
        p = portal["location_cm"]
        district = portal["district"]
        z = district_z(manifest, district)
        code = portal["code"]
        accent = materials["portal"].get(code, materials["blue"])
        inward, side = inward_basis(float(p["x"]), float(p["y"]))
        yaw = math.degrees(math.atan2(inward[1], inward[0]))
        spawn_cylinder(
            f"HUB_V5_PORTAL_{code}_ESPLANADE",
            [p["x"], p["y"], z + 35],
            1800,
            70,
            tag,
            f"HUB_3B_V5/PORTALS/{code}",
            materials["stone"],
        )
        for side_sign in (-1, 1):
            px = p["x"] + side[0] * 560 * side_sign
            py = p["y"] + side[1] * 560 * side_sign
            spawn_box(
                f"HUB_V5_PORTAL_{code}_PILLAR_{'L' if side_sign < 0 else 'R'}",
                [px, py, z + 520],
                [180, 240, 1040],
                yaw,
                tag,
                f"HUB_3B_V5/PORTALS/{code}",
                materials["gold"],
            )
        spawn_box(
            f"HUB_V5_PORTAL_{code}_BEAM",
            [p["x"], p["y"], z + 1010],
            [1320, 260, 160],
            yaw,
            tag,
            f"HUB_3B_V5/PORTALS/{code}",
            materials["gold"],
        )
        spawn_box(
            f"HUB_V5_PORTAL_{code}_ENERGY",
            [p["x"] + inward[0] * 20, p["y"] + inward[1] * 20, z + 510],
            [920, 34, 820],
            yaw,
            tag,
            f"HUB_3B_V5/PORTALS/{code}/ENERGY",
            accent,
        )
        facility = portal.get("facility") or {}
        fx = p["x"] + inward[0] * 1550
        fy = p["y"] + inward[1] * 1550
        spawn_box(
            f"HUB_V5_PORTAL_{code}_FACILITY",
            [fx, fy, z + 420],
            [2200, 1500, 840],
            yaw,
            tag,
            f"HUB_3B_V5/PORTALS/{code}/FACILITY",
            district_material(district, materials),
        )
        spawn_box(
            f"HUB_V5_PORTAL_{code}_FACILITY_ACCENT",
            [fx, fy, z + 875],
            [1700, 1100, 70],
            yaw,
            tag,
            f"HUB_3B_V5/PORTALS/{code}/FACILITY",
            accent,
        )
        spawn_target(
            f"HUB_V5_TRAVEL_ANCHOR_{code}",
            [p["x"] + inward[0] * 420, p["y"] + inward[1] * 420, z + 120],
            tag,
            f"HUB_3B_V5/PORTALS/{code}/ANCHORS",
        )


def spawn_water(manifest, layout, canon, tag, materials):
    districts = district_lookup(layout)
    for index, feature in enumerate(canon.get("waterNetwork", {}).get("features", [])):
        if feature.get("fromDistrict") and feature.get("toDistrict"):
            a = districts[feature["fromDistrict"]]["location_cm"]
            b = districts[feature["toDistrict"]]["location_cm"]
            z_a = district_z(manifest, feature["fromDistrict"]) - 80
            z_b = district_z(manifest, feature["toDistrict"]) - 80
            center, length, yaw, pitch = segment_transform(a, b, z_a, z_b)
            spawn_box(
                f"HUB_V5_WATER_{index:02d}",
                center,
                [length, float(feature.get("width", 18))*100.0, 24],
                yaw,
                tag,
                "HUB_3B_V5/WATER",
                materials["water"],
                pitch_deg=pitch,
            )
        else:
            district = feature.get("district", "heritage_square")
            p = districts[district]["location_cm"]
            offset = feature.get("offset", [0,0])
            z = district_z(manifest, district) - 70
            width = float(feature.get("width", 24))*100.0
            depth = float(feature.get("depth", feature.get("width", 24)))*100.0
            spawn_box(
                f"HUB_V5_WATER_{index:02d}",
                [p["x"] + float(offset[0])*100.0, p["y"] + float(offset[1])*100.0, z],
                [width, depth, 28],
                0,
                tag,
                "HUB_3B_V5/WATER",
                materials["water"],
            )
            if feature.get("kind") == "cascade":
                spawn_box(
                    f"HUB_V5_WATER_{index:02d}_FALL",
                    [p["x"] + float(offset[0])*100.0, p["y"] + float(offset[1])*100.0, z - float(feature.get("drop", 12))*50.0],
                    [width, 80, float(feature.get("drop", 12))*100.0],
                    0,
                    tag,
                    "HUB_3B_V5/WATER",
                    materials["water"],
                )


def spawn_skybridges(manifest, layout, canon, tag, materials):
    districts = district_lookup(layout)
    for index, link in enumerate(canon.get("verticalLinks", [])):
        a = districts[link["from"]]["location_cm"]
        b = districts[link["to"]]["location_cm"]
        base_a = district_z(manifest, link["from"])
        base_b = district_z(manifest, link["to"])
        extra = 800 + float(link.get("level", 1))*650
        center, length, yaw, pitch = segment_transform(a, b, base_a+extra, base_b+extra)
        spawn_box(
            f"HUB_V5_SKYBRIDGE_{index+1:02d}",
            center,
            [length, 520, 90],
            yaw,
            tag,
            "HUB_3B_V5/SKYBRIDGES",
            materials["black"],
            pitch_deg=pitch,
        )
        spawn_box(
            f"HUB_V5_SKYBRIDGE_{index+1:02d}_GUIDE",
            [center[0], center[1], center[2]+70],
            [length*.94, 42, 24],
            yaw,
            tag,
            "HUB_3B_V5/SKYBRIDGES/GUIDES",
            materials["blue"] if index%2 else materials["gold"],
            pitch_deg=pitch,
        )


def spawn_transit(manifest, layout, canon, tag, materials):
    districts = district_lookup(layout)
    stations = canon.get("transport", {}).get("train", {}).get("stations", [])
    for index, district_id in enumerate(stations):
        next_id = stations[(index+1)%len(stations)]
        a = districts[district_id]["location_cm"]
        b = districts[next_id]["location_cm"]
        z_a = district_z(manifest, district_id) + 180
        z_b = district_z(manifest, next_id) + 180
        center, length, yaw, pitch = segment_transform(a,b,z_a,z_b)
        for offset in (-220,220):
            rad = math.radians(yaw+90.0)
            ox = math.cos(rad)*offset
            oy = math.sin(rad)*offset
            spawn_box(
                f"HUB_V5_TRAIN_RAIL_{index:02d}_{'A' if offset<0 else 'B'}",
                [center[0]+ox,center[1]+oy,center[2]],
                [length, 26, 28],
                yaw,
                tag,
                "HUB_3B_V5/TRANSIT/TRAIN",
                materials["gold"],
                pitch_deg=pitch,
            )

    for transport_key, height in (("telepherics", 4200), ("ziplines", 2600)):
        lines = canon.get("transport", {}).get(transport_key, {}).get("lines", [])
        for index, line in enumerate(lines):
            a = districts[line["from"]]["location_cm"]
            b = districts[line["to"]]["location_cm"]
            center, length, yaw, pitch = segment_transform(
                a,b,
                district_z(manifest,line["from"])+height,
                district_z(manifest,line["to"])+height,
            )
            spawn_box(
                f"HUB_V5_{transport_key.upper()}_{index:02d}",
                center,
                [length, 18 if transport_key=="telepherics" else 10, 18 if transport_key=="telepherics" else 10],
                yaw,
                tag,
                f"HUB_3B_V5/TRANSIT/{transport_key.upper()}",
                materials["gold"] if transport_key=="telepherics" else materials["blue"],
                pitch_deg=pitch,
            )


def spawn_gardens(manifest, layout, tag, materials):
    districts = district_lookup(layout)
    p = districts["gardens"]["location_cm"]
    z = district_z(manifest, "gardens")
    for index in range(24):
        angle = index * math.tau / 24.0 + deterministic(f"tree:{index}")*.2
        radius = 2600 + (index%4)*1100
        x = p["x"] + math.cos(angle)*radius
        y = p["y"] + math.sin(angle)*radius
        h = 650 + deterministic(f"treeh:{index}")*700
        spawn_cylinder(f"HUB_V5_TREE_{index:02d}_TRUNK",[x,y,z+h*.28],120,h*.56,tag,"HUB_3B_V5/GARDENS",materials["wood"])
        spawn_sphere(f"HUB_V5_TREE_{index:02d}_CROWN",[x,y,z+h*.72],620,tag,"HUB_3B_V5/GARDENS",materials["green"])


def spawn_arrival(manifest, layout, tag, materials):
    districts = district_lookup(layout)
    p = districts["heritage_square"]["location_cm"]
    z = district_z(manifest, "heritage_square")
    spawn_target("HUB_V5_PLAYER_START_SAFE",[p["x"],p["y"],z+120],tag,"HUB_3B_V5/START")
    for side in (-1,1):
        spawn_box(
            f"HUB_V5_ARRIVAL_GATE_{'L' if side<0 else 'R'}",
            [p["x"]+side*720,p["y"]+1150,z+500],
            [180,220,1000],
            0,tag,"HUB_3B_V5/START",materials["gold"]
        )
    spawn_box("HUB_V5_ARRIVAL_GATE_BEAM",[p["x"],p["y"]+1150,z+980],[1640,260,160],0,tag,"HUB_3B_V5/START",materials["gold"])
    spawn_box("HUB_V5_ARRIVAL_MATRIX",[p["x"],p["y"]+1080,z+500],[1180,30,760],0,tag,"HUB_3B_V5/START",materials["blue"])


def validate(manifest):
    labels = []
    actors = actor_subsystem().get_all_level_actors()
    tag_name = unreal.Name(manifest["generated_tag"])
    for actor in actors:
        try:
            if tag_name in list(actor.tags):
                labels.append(actor.get_actor_label())
        except Exception:
            pass

    def count(prefix):
        return sum(1 for label in labels if label.startswith(prefix))

    checks = {
        "map": current_level_name() == manifest["required_map_name"],
        "districts": count("HUB_V5_DISTRICT_") == manifest["validation"]["required_district_count"],
        "buildings": count("HUB_V5_BUILDING_") >= manifest["validation"]["required_building_count"],
        "portals": count("HUB_V5_PORTAL_") >= manifest["validation"]["required_portal_count"] * 5,
        "civic": count("HUB_V5_CIVIC_") >= manifest["validation"]["minimum_civic_structures"],
        "water": count("HUB_V5_WATER_") >= manifest["validation"]["minimum_water_features"],
        "landmarks": count("HUB_V5_LANDMARK_") >= manifest["validation"]["minimum_landmarks"],
        "skybridges": count("HUB_V5_SKYBRIDGE_") >= manifest["validation"]["minimum_skybridges"],
        "no_legacy_radial": not any(
            token in label for label in labels for token in ("HUB_V4_RING_","HUB_V4_SPOKE_","HUB_V4_PETAL_")
        ),
    }
    failed = [name for name, ok in checks.items() if not ok]
    log("Validation V5: " + " ".join(f"{name}={ok}" for name,ok in checks.items()))
    if failed:
        raise RuntimeError("VALIDATION HUB 3B V5 ÉCHOUÉE: " + ", ".join(failed))
    log("VALIDATION HUB 3B V5 PREMIUM: OK")


def frame_view():
    try:
        editor_subsystem().set_level_viewport_camera_info(
            unreal.Vector(-76000.0, -76000.0, 52000.0),
            unreal.Rotator(-28.0, 42.0, 0.0),
        )
    except Exception as exc:
        warn(f"Caméra de présentation non réglée: {exc}")


def save_level():
    try:
        if hasattr(level_subsystem(), "save_current_level"):
            level_subsystem().save_current_level()
            return
    except Exception:
        pass
    try:
        unreal.EditorLevelLibrary.save_current_level()
    except Exception as exc:
        warn(f"Sauvegarde automatique non confirmée: {exc}")


def build():
    manifest, layout, canon = load_sources()
    tag = manifest["generated_tag"]
    log("=== HUB3B_MAIN_V05 — CITÉ DES HUIT HÉRITAGES PREMIUM ===")
    log("Référence maîtresse: La Cité des Huit Héritages")
    open_or_create_level(manifest["map_asset"], manifest["required_map_name"])
    destroy_previous(tag)
    materials = create_materials(manifest)

    spawn_city_floor(manifest, layout, tag, materials)
    spawn_roads(manifest, layout, tag, materials)
    spawn_water(manifest, layout, canon, tag, materials)
    spawn_civic_fabric(manifest, layout, canon, tag, materials)
    spawn_canonical_buildings(manifest, layout, tag, materials)
    spawn_landmarks(manifest, layout, canon, tag, materials)
    spawn_broken_circle_monument(manifest, layout, tag, materials)
    spawn_skybridges(manifest, layout, canon, tag, materials)
    spawn_transit(manifest, layout, canon, tag, materials)
    spawn_portals(manifest, tag, materials)
    spawn_gardens(manifest, layout, tag, materials)
    spawn_arrival(manifest, layout, tag, materials)

    validate(manifest)
    frame_view()
    save_level()
    log("Hub3B_Main_V05 construit: métropole dense, verticale, sûre, 8 Portes dispersées.")
    log("Le petit Nexus circulaire V4 reste historique et n'est plus la map canonique.")


if __name__ == "__main__":
    build()
