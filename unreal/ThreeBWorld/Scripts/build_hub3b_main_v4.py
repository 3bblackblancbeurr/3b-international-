import json
import math
import os
import traceback
import unreal

MANIFEST_REL = os.path.join("Data", "Production", "hub3b-main-v4.json")
CUBE_PATH = "/Engine/BasicShapes/Cube.Cube"
CYLINDER_PATH = "/Engine/BasicShapes/Cylinder.Cylinder"
MATERIAL_FOLDER = "/Game/3binternational/HubV4/Materials"


def log(message):
    unreal.log(f"[3B HUB V4] {message}")


def warn(message):
    unreal.log_warning(f"[3B HUB V4] {message}")


def project_file(*parts):
    return os.path.join(unreal.Paths.project_dir(), *parts)


def load_manifest():
    path = project_file("Data", "Production", "hub3b-main-v4.json")
    if not os.path.exists(path):
        raise RuntimeError(f"Manifest Hub 3B V4 introuvable: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def actor_subsystem():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def level_subsystem():
    return unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def editor_subsystem():
    return unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)


def polar(angle_deg, radius_cm, z_cm=0.0):
    angle = math.radians(float(angle_deg))
    return [
        math.cos(angle) * float(radius_cm),
        math.sin(angle) * float(radius_cm),
        float(z_cm),
    ]


def current_level_name():
    world = editor_subsystem().get_editor_world()
    if world is None:
        return ""
    try:
        return str(unreal.GameplayStatics.get_current_level_name(world, True))
    except Exception:
        return ""


def ensure_directory(path):
    try:
        unreal.EditorAssetLibrary.make_directory(path)
    except Exception:
        pass


def open_or_create_level(asset_path, required_name):
    ensure_directory(asset_path.rsplit("/", 1)[0])
    ls = level_subsystem()

    try:
        exists = bool(unreal.EditorAssetLibrary.does_asset_exist(asset_path))
    except Exception:
        exists = False

    if exists:
        log(f"Chargement de la map V4: {asset_path}")
        if not ls.load_level(asset_path):
            raise RuntimeError(f"Impossible de charger {asset_path}")
    else:
        log(f"Création de la map World Partition V4: {asset_path}")
        if not ls.new_level(asset_path, True):
            raise RuntimeError(
                "Impossible de créer Hub3B_Main_V04. Fermer PIE et vérifier les droits d'écriture."
            )

    actual = current_level_name()
    if actual != required_name:
        raise RuntimeError(
            f"SÉCURITÉ: map active '{actual or 'inconnue'}' au lieu de '{required_name}'. "
            "Construction V4 annulée."
        )
    log(f"Map V4 confirmée: {actual}")


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
    log(f"{removed} ancien(s) acteur(s) V4 supprimé(s)")


def remove_landscapes_or_abort(required_name):
    if current_level_name() != required_name:
        raise RuntimeError("SÉCURITÉ: tentative de nettoyage Landscape hors map V4.")

    landscapes = []
    for actor in actor_subsystem().get_all_level_actors():
        try:
            if "Landscape" in actor.get_class().get_name():
                landscapes.append(actor)
        except Exception:
            pass

    for actor in landscapes:
        actor_subsystem().destroy_actor(actor)

    if landscapes:
        log(f"{len(landscapes)} Landscape supprimé(s) de la map V4 dédiée.")


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
        material = tools.create_asset(
            name,
            MATERIAL_FOLDER,
            unreal.Material,
            unreal.MaterialFactoryNew(),
        )
        if not material:
            return None

        base = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant3Vector, -500, -100
        )
        base.set_editor_property(
            "constant",
            unreal.LinearColor(
                float(base_rgb[0]), float(base_rgb[1]), float(base_rgb[2]), 1.0
            ),
        )
        unreal.MaterialEditingLibrary.connect_material_property(
            base, "", unreal.MaterialProperty.MP_BASE_COLOR
        )

        metal = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant, -500, 50
        )
        metal.set_editor_property("r", float(metallic))
        unreal.MaterialEditingLibrary.connect_material_property(
            metal, "", unreal.MaterialProperty.MP_METALLIC
        )

        rough = unreal.MaterialEditingLibrary.create_material_expression(
            material, unreal.MaterialExpressionConstant, -500, 180
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
                    float(emissive_rgb[0]),
                    float(emissive_rgb[1]),
                    float(emissive_rgb[2]),
                    1.0,
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


def create_materials():
    return {
        "black": create_material(
            "M_HubV4_Black",
            [0.012, 0.018, 0.028],
            metallic=0.72,
            roughness=0.34,
        ),
        "gold": create_material(
            "M_HubV4_Gold",
            [0.62, 0.42, 0.16],
            metallic=0.88,
            roughness=0.24,
        ),
        "blue": create_material(
            "M_HubV4_MatrixBlue",
            [0.0, 0.08, 0.18],
            metallic=0.25,
            roughness=0.18,
            emissive_rgb=[0.0, 2.4, 8.0],
        ),
    }


def spawn_core(manifest, tag, materials):
    core = manifest["core"]
    surface = float(core["surface_z_cm"])
    diameter = float(core["diameter_cm"])
    thickness = float(core["thickness_cm"])

    spawn_cylinder(
        "HUB_V4_CORE_MAIN",
        [0, 0, surface - thickness * 0.5],
        diameter,
        thickness,
        tag,
        "HUB_3B_V4/CORE",
        materials["black"],
    )

    # Dais central noir + liseré or bas, sans tour opaque.
    spawn_cylinder(
        "HUB_V4_CORE_GOLD_DAIS",
        [0, 0, surface + 10],
        1200,
        22,
        tag,
        "HUB_3B_V4/CORE",
        materials["gold"],
    )
    spawn_cylinder(
        "HUB_V4_CORE_INNER_DAIS",
        [0, 0, surface + 24],
        1050,
        26,
        tag,
        "HUB_3B_V4/CORE",
        materials["black"],
    )

    bottom = surface - thickness
    for index, tier in enumerate(core["underside_tiers"], start=1):
        depth = float(tier["depth_cm"])
        spawn_cylinder(
            f"HUB_V4_CORE_UNDER_{index}",
            [0, 0, bottom - depth * 0.5],
            float(tier["diameter_cm"]),
            depth,
            tag,
            "HUB_3B_V4/UNDERSIDE",
            materials["black"],
        )
        bottom -= depth


def spawn_ring(manifest, tag, materials):
    ring = manifest["ring"]
    radius = float(ring["radius_cm"])
    count = int(ring["segment_count"])
    z = float(ring["surface_z_cm"])
    thickness = float(ring["thickness_cm"])

    for i in range(count):
        angle = i * 360.0 / count
        center = polar(angle, radius, z - thickness * 0.5)
        spawn_box(
            f"HUB_V4_RING_{i:02d}",
            center,
            [
                float(ring["segment_length_cm"]),
                float(ring["radial_width_cm"]),
                thickness,
            ],
            angle + 90.0,
            tag,
            "HUB_3B_V4/RING",
            materials["black"],
        )


def spawn_spoke(portal, manifest, tag, materials):
    spokes = manifest["spokes"]
    angle = float(portal["angle_deg"])
    start_r = float(spokes["start_radius_cm"])
    end_r = float(spokes["end_radius_cm"])
    width = float(spokes["width_cm"])
    core_z = float(manifest["core"]["surface_z_cm"])
    ring_z = float(manifest["ring"]["surface_z_cm"])
    horizontal = end_r - start_r
    dz = ring_z - core_z
    length = math.sqrt(horizontal * horizontal + dz * dz)
    mid_r = (start_r + end_r) * 0.5
    mid_z = (core_z + ring_z) * 0.5 - float(spokes["thickness_cm"]) * 0.5
    pitch = -math.degrees(math.atan2(dz, horizontal))

    spawn_box(
        f"HUB_V4_SPOKE_{portal['code']}",
        polar(angle, mid_r, mid_z),
        [length, width, float(spokes["thickness_cm"])],
        angle,
        tag,
        "HUB_3B_V4/SPOKES",
        materials["black"],
        pitch_deg=pitch,
    )

    # Guide Matrix au sol, uniquement sur la surface du spoke.
    spawn_box(
        f"HUB_V4_GUIDE_{portal['code']}_INNER",
        polar(angle, mid_r, mid_z + float(spokes["thickness_cm"]) * 0.5 + 5),
        [horizontal * 0.88, 36, 10],
        angle,
        tag,
        "HUB_3B_V4/GUIDES",
        materials["blue"],
        pitch_deg=pitch,
    )


def spawn_petals_and_pad(portal, manifest, tag, materials):
    petals = manifest["petals"]
    angle = float(portal["angle_deg"])
    start = float(petals["start_radius_cm"])
    seg_len = float(petals["segment_length_cm"])
    widths = [float(x) for x in petals["segment_widths_cm"]]
    thickness = float(petals["thickness_cm"])
    target_z = float(portal["terrace_surface_z_cm"])

    total_len = seg_len * len(widths)
    for i, width in enumerate(widths):
        center_r = start + seg_len * (i + 0.5)
        t = min(1.0, (center_r - start) / max(1.0, float(portal["terrace_radius_cm"]) - start))
        surface_z = target_z * t
        spawn_box(
            f"HUB_V4_PETAL_{portal['code']}_{i+1}",
            polar(angle, center_r, surface_z - thickness * 0.5),
            [seg_len + 45, width, thickness],
            angle,
            tag,
            "HUB_3B_V4/PETALS",
            materials["black"],
        )
        spawn_box(
            f"HUB_V4_GUIDE_{portal['code']}_PETAL_{i+1}",
            polar(angle, center_r, surface_z + 5),
            [seg_len * 0.86, 38, 10],
            angle,
            tag,
            "HUB_3B_V4/GUIDES",
            materials["blue"],
        )

    pad_r = float(portal["terrace_radius_cm"])
    pad_size = petals["portal_pad_size_cm"]
    spawn_box(
        f"HUB_V4_PORTAL_PAD_{portal['code']}",
        polar(angle, pad_r, target_z - thickness * 0.5),
        [float(pad_size[0]), float(pad_size[1]), thickness + 20],
        angle,
        tag,
        "HUB_3B_V4/PORTAL_PADS",
        materials["black"],
    )

    # Liseré or devant chaque porte.
    spawn_box(
        f"HUB_V4_PORTAL_GOLD_LINE_{portal['code']}",
        polar(angle, pad_r + 330, target_z + 8),
        [90, float(pad_size[1]) * 0.74, 14],
        angle,
        tag,
        "HUB_3B_V4/PORTAL_PADS",
        materials["gold"],
    )


def tangent_offset(angle_deg, radial_radius, tangent_cm, z_cm):
    a = math.radians(float(angle_deg))
    radial_x = math.cos(a) * float(radial_radius)
    radial_y = math.sin(a) * float(radial_radius)
    tangent_x = -math.sin(a) * float(tangent_cm)
    tangent_y = math.cos(a) * float(tangent_cm)
    return [radial_x + tangent_x, radial_y + tangent_y, float(z_cm)]


def spawn_text(label, text, location, yaw_deg, tag):
    try:
        actor = actor_subsystem().spawn_actor_from_class(
            unreal.TextRenderActor,
            unreal.Vector(float(location[0]), float(location[1]), float(location[2])),
            unreal.Rotator(0.0, float(yaw_deg), 0.0),
            transient=False,
        )
        if not actor:
            return None
        mark(actor, label, tag, "HUB_3B_V4/PORTAL_LABELS")
        comp = actor.get_component_by_class(unreal.TextRenderComponent)
        if comp:
            try:
                comp.set_text(str(text))
            except Exception:
                comp.set_editor_property("text", str(text))
            try:
                comp.set_editor_property("world_size", 115.0)
                comp.set_editor_property("horizontal_alignment", unreal.HorizontalTextAligment.EHTA_CENTER)
                comp.set_editor_property("text_render_color", unreal.Color(214, 180, 106, 255))
            except Exception:
                pass
        return actor
    except Exception as exc:
        warn(f"Label visible {label} non créé: {exc}")
        return None


def spawn_point_light(label, location, tag):
    try:
        actor = actor_subsystem().spawn_actor_from_class(
            unreal.PointLight,
            unreal.Vector(float(location[0]), float(location[1]), float(location[2])),
            unreal.Rotator(0.0, 0.0, 0.0),
            transient=False,
        )
        if not actor:
            return
        mark(actor, label, tag, "HUB_3B_V4/PORTAL_LIGHTS")
        comp = actor.get_component_by_class(unreal.PointLightComponent)
        if comp:
            try:
                comp.set_editor_property("intensity", 4200.0)
                comp.set_editor_property("attenuation_radius", 1500.0)
                comp.set_editor_property("light_color", unreal.Color(0, 145, 255, 255))
            except Exception:
                pass
    except Exception as exc:
        warn(f"Lumière portail {label} non créée: {exc}")


def spawn_portal(portal, manifest, tag, materials):
    arch = manifest["portal_arch"]
    angle = float(portal["angle_deg"])
    radius = float(portal["arch_radius_cm"])
    surface = float(portal["terrace_surface_z_cm"])
    tangent_yaw = angle + 90.0

    opening_w = float(arch["opening_width_cm"])
    opening_h = float(arch["opening_height_cm"])
    pillar_w = float(arch["pillar_width_cm"])
    beam_h = float(arch["beam_height_cm"])
    depth = float(arch["depth_cm"])

    offset = opening_w * 0.5 + pillar_w * 0.5
    pillar_z = surface + opening_h * 0.5

    for side, tangent in (("L", -offset), ("R", offset)):
        spawn_box(
            f"HUB_V4_PORTAL_{portal['code']}_{side}",
            tangent_offset(angle, radius, tangent, pillar_z),
            [pillar_w, depth, opening_h],
            tangent_yaw,
            tag,
            "HUB_3B_V4/PORTALS",
            materials["black"],
        )

    spawn_box(
        f"HUB_V4_PORTAL_{portal['code']}_TOP",
        polar(angle, radius, surface + opening_h + beam_h * 0.5),
        [opening_w + pillar_w * 2.0, depth, beam_h],
        tangent_yaw,
        tag,
        "HUB_3B_V4/PORTALS",
        materials["gold"],
    )

    spawn_box(
        f"HUB_V4_PORTAL_{portal['code']}_ENERGY",
        polar(angle, radius, surface + opening_h * 0.5),
        [opening_w, float(arch["energy_depth_cm"]), opening_h * 0.92],
        tangent_yaw,
        tag,
        "HUB_3B_V4/PORTALS",
        materials["blue"],
    )

    # Petit socle Matrix lisible au pied de la porte.
    spawn_box(
        f"HUB_V4_PORTAL_{portal['code']}_THRESHOLD",
        polar(angle, radius - 230, surface + 8),
        [320, opening_w * 0.82, 16],
        angle,
        tag,
        "HUB_3B_V4/PORTALS",
        materials["blue"],
    )

    label_pos = polar(
        angle,
        radius - 60,
        surface + float(arch["overall_height_cm"]) + float(arch["label_height_cm"]),
    )
    spawn_text(
        f"HUB_V4_LABEL_{portal['code']}",
        f"{portal['country']}  •  {portal['value']}",
        label_pos,
        angle + 180.0,
        tag,
    )

    spawn_point_light(
        f"HUB_V4_PORTAL_LIGHT_{portal['code']}",
        polar(angle, radius - 180, surface + 440),
        tag,
    )

    # Marqueur de branchement futur vers le monde du pays.
    marker = actor_subsystem().spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(*[float(v) for v in polar(angle, radius + 250, surface + 120)]),
        unreal.Rotator(0.0, float(angle), 0.0),
        transient=False,
    )
    if marker:
        mark(
            marker,
            f"HUB_V4_TRAVEL_ANCHOR_{portal['code']}_{portal['state'].upper()}",
            tag,
            "HUB_3B_V4/TRAVEL_ANCHORS",
        )


def spawn_petal_understructure(portal, manifest, tag, materials):
    angle = float(portal["angle_deg"])
    target_z = float(portal["terrace_surface_z_cm"])
    # Trois nervures décroissantes sous chaque avancée.
    tiers = [
        (4050, 900, 1120, 420),
        (4700, 760, 960, 520),
        (5250, 620, 760, 620),
    ]
    for i, (radius, length, width, depth) in enumerate(tiers, start=1):
        spawn_box(
            f"HUB_V4_UNDER_RIB_{portal['code']}_{i}",
            polar(angle, radius, target_z - 150 - depth * 0.5),
            [length, width, depth],
            angle,
            tag,
            "HUB_3B_V4/UNDERSIDE",
            materials["black"],
        )


def spawn_ring_buttresses(manifest, tag, materials):
    # Huit contreforts orientés vers le noyau, laissant de grands vides entre eux.
    for portal in manifest["portals"]:
        angle = float(portal["angle_deg"])
        spawn_box(
            f"HUB_V4_BUTTRESS_{portal['code']}",
            polar(angle, 2650, -620),
            [1250, 420, 1050],
            angle,
            tag,
            "HUB_3B_V4/UNDERSIDE",
            materials["black"],
            pitch_deg=-10.0,
        )


def remove_environment_duplicates():
    names = [
        "DirectionalLight",
        "SkyLight",
        "SkyAtmosphere",
        "ExponentialHeightFog",
        "VolumetricCloud",
    ]
    classes = [getattr(unreal, name, None) for name in names]
    for actor in actor_subsystem().get_all_level_actors():
        try:
            if actor.get_class() in classes:
                actor_subsystem().destroy_actor(actor)
        except Exception:
            pass


def spawn_environment(manifest, tag):
    remove_environment_duplicates()
    specs = [
        ("DirectionalLight", "HUB_V4_ENV_SUN", [0, 0, 6500], [-34, -28, 0]),
        ("SkyLight", "HUB_V4_ENV_SKYLIGHT", [0, 0, 2600], [0, 0, 0]),
        ("SkyAtmosphere", "HUB_V4_ENV_SKY", [0, 0, 0], [0, 0, 0]),
        ("ExponentialHeightFog", "HUB_V4_ENV_FOG", [0, 0, -2600], [0, 0, 0]),
        (
            "VolumetricCloud",
            "HUB_V4_ENV_CLOUD",
            [0, 0, float(manifest["design"]["deep_cloud_start_cm"])],
            [0, 0, 0],
        ),
    ]
    for class_name, label, loc, rot in specs:
        cls = getattr(unreal, class_name, None)
        if cls is None:
            warn(f"Classe environnement indisponible: {class_name}")
            continue
        try:
            actor = actor_subsystem().spawn_actor_from_class(
                cls,
                unreal.Vector(float(loc[0]), float(loc[1]), float(loc[2])),
                unreal.Rotator(float(rot[0]), float(rot[1]), float(rot[2])),
                transient=False,
            )
            if actor:
                mark(actor, label, tag, "HUB_3B_V4/ENVIRONMENT")
        except Exception as exc:
            warn(f"{label} non créé: {exc}")


def spawn_fragments(manifest, tag, materials):
    for frag in manifest.get("fragments", []):
        loc = polar(frag["angle_deg"], frag["radius_cm"], frag["z_cm"])
        spawn_box(
            f"HUB_V4_FRAGMENT_{frag['id']}",
            loc,
            frag["size_cm"],
            frag["yaw_deg"],
            tag,
            "HUB_3B_V4/DISTANT_FRAGMENTS",
            materials["black"],
        )


def configure_world(manifest):
    try:
        world = editor_subsystem().get_editor_world()
        settings = world.get_world_settings()
        settings.set_editor_property("kill_z", float(manifest["design"]["recovery_kill_z_cm"]))
        log(f"Kill Z V4: {manifest['design']['recovery_kill_z_cm']} cm")
    except Exception as exc:
        warn(f"Kill Z non réglé automatiquement: {exc}")


def spawn_player_start(manifest, tag):
    z = float(manifest["core"]["surface_z_cm"]) + 150.0
    actor = actor_subsystem().spawn_actor_from_class(
        unreal.PlayerStart,
        unreal.Vector(0.0, 0.0, z),
        unreal.Rotator(0.0, 0.0, 0.0),
        transient=False,
    )
    if actor:
        mark(actor, "HUB_V4_PLAYER_START", tag, "HUB_3B_V4/SAFE")


def validate(manifest, tag):
    labels = []
    landscapes = []
    tag_name = unreal.Name(tag)

    for actor in actor_subsystem().get_all_level_actors():
        try:
            if tag_name in list(actor.tags):
                labels.append(actor.get_actor_label())
        except Exception:
            pass
        try:
            if "Landscape" in actor.get_class().get_name():
                landscapes.append(actor)
        except Exception:
            pass

    required = manifest["validation"]
    checks = {
        "map": current_level_name() == required["required_map_name"],
        "portals": len([x for x in labels if x.endswith("_ENERGY") and "PORTAL_" in x])
        == int(required["required_portal_count"]),
        "ring": len([x for x in labels if x.startswith("HUB_V4_RING_")])
        == int(required["required_ring_segments"]),
        "spokes": len([x for x in labels if x.startswith("HUB_V4_SPOKE_")])
        == int(required["required_spokes"]),
        "petals": len([x for x in labels if x.startswith("HUB_V4_PETAL_")])
        == int(required["required_petal_segments"]),
        "no_landscape": len(landscapes) == 0,
    }

    log(
        "Validation V4: "
        f"map={checks['map']} "
        f"portails={sum(1 for x in labels if x.endswith('_ENERGY') and 'PORTAL_' in x)}/8 "
        f"ring={sum(1 for x in labels if x.startswith('HUB_V4_RING_'))}/24 "
        f"spokes={sum(1 for x in labels if x.startswith('HUB_V4_SPOKE_'))}/8 "
        f"petals={sum(1 for x in labels if x.startswith('HUB_V4_PETAL_'))}/24 "
        f"landscape={len(landscapes)}"
    )

    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        raise RuntimeError("VALIDATION V4 ÉCHOUÉE: " + ", ".join(failed))

    log("VALIDATION HUB 3B V4: OK")
    return True


def frame_view():
    try:
        editor_subsystem().set_level_viewport_camera_info(
            unreal.Vector(-9800.0, -9800.0, 7600.0),
            unreal.Rotator(-30.0, 45.0, 0.0),
        )
    except Exception as exc:
        warn(f"Caméra de présentation non réglée: {exc}")


def build():
    manifest = load_manifest()
    required_name = manifest["validation"]["required_map_name"]
    map_asset = manifest["map_asset"]
    tag = manifest["generated_tag"]

    log("=== HUB 3B V4 — plateforme centrale + 8 portails ===")
    open_or_create_level(map_asset, required_name)
    remove_landscapes_or_abort(required_name)
    destroy_previous(tag)

    materials = create_materials()

    steps = 6 + len(manifest["portals"]) * 4 + len(manifest.get("fragments", []))
    with unreal.ScopedSlowTask(steps, "Construction du vrai Hub 3B V4") as task:
        task.make_dialog(True)

        task.enter_progress_frame(1, "Cœur central")
        spawn_core(manifest, tag, materials)

        task.enter_progress_frame(1, "Anneau principal")
        spawn_ring(manifest, tag, materials)

        for portal in manifest["portals"]:
            task.enter_progress_frame(1, f"Accès {portal['country']}")
            spawn_spoke(portal, manifest, tag, materials)

            task.enter_progress_frame(1, f"Terrasse {portal['country']}")
            spawn_petals_and_pad(portal, manifest, tag, materials)

            task.enter_progress_frame(1, f"Portail {portal['country']}")
            spawn_portal(portal, manifest, tag, materials)

            task.enter_progress_frame(1, f"Dessous {portal['country']}")
            spawn_petal_understructure(portal, manifest, tag, materials)

        task.enter_progress_frame(1, "Structure sous le hub")
        spawn_ring_buttresses(manifest, tag, materials)

        for frag in manifest.get("fragments", []):
            task.enter_progress_frame(1, f"Fragment {frag['id']}")
        spawn_fragments(manifest, tag, materials)

        task.enter_progress_frame(1, "Atmosphère")
        spawn_environment(manifest, tag)

        task.enter_progress_frame(1, "Spawn et monde")
        spawn_player_start(manifest, tag)
        configure_world(manifest)

        task.enter_progress_frame(1, "Validation finale V4")
        validate(manifest, tag)

    if current_level_name() != required_name:
        raise RuntimeError("SÉCURITÉ: map V4 perdue avant sauvegarde.")

    if not level_subsystem().save_current_level():
        raise RuntimeError("Échec de sauvegarde automatique de Hub3B_Main_V04.")

    frame_view()
    log("=== HUB 3B V4 CONSTRUIT ET SAUVEGARDÉ ===")
    log("Les 8 portails sont présents comme architecture et ancres de voyage. Les mondes pays seront branchés ensuite.")


if __name__ == "__main__":
    try:
        build()
    except Exception:
        unreal.log_error("[3B HUB V4] ERREUR FATALE:\n" + traceback.format_exc())
        raise
