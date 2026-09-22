import json
import math
import os
import unreal

MANIFEST_REL = os.path.join("Data", "Production", "hub3b-void-blockout-v3.json")
CUBE_PATH = "/Engine/BasicShapes/Cube.Cube"


def log(message):
    unreal.log(f"[3B HUB V3] {message}")


def warn(message):
    unreal.log_warning(f"[3B HUB V3] {message}")


def project_file(*parts):
    return os.path.join(unreal.Paths.project_dir(), *parts)


def load_manifest():
    path = project_file(*MANIFEST_REL.split(os.sep))
    if not os.path.exists(path):
        path = project_file("Data", "Production", "hub3b-void-blockout-v3.json")
    if not os.path.exists(path):
        raise RuntimeError(f"Manifest Hub 3B introuvable: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def actor_subsystem():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def level_subsystem():
    return unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def editor_subsystem():
    return unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)


def ensure_content_path(asset_path):
    folder = asset_path.rsplit("/", 1)[0]
    try:
        unreal.EditorAssetLibrary.make_directory(folder)
    except Exception as exc:
        warn(f"Impossible de confirmer le dossier {folder}: {exc}")


def current_level_name():
    world = editor_subsystem().get_editor_world()
    if world is None:
        return ""
    try:
        return str(unreal.GameplayStatics.get_current_level_name(world, True))
    except Exception:
        return ""


def open_or_create_level(asset_path):
    ensure_content_path(asset_path)
    ls = level_subsystem()
    expected_name = asset_path.rsplit("/", 1)[-1]

    exists = False
    try:
        exists = bool(unreal.EditorAssetLibrary.does_asset_exist(asset_path))
    except Exception:
        exists = False

    if exists:
        log(f"Chargement de la map existante: {asset_path}")
        if not ls.load_level(asset_path):
            raise RuntimeError(f"Impossible de charger la map Hub 3B existante: {asset_path}")
    else:
        log(f"Création de la map World Partition: {asset_path}")
        if not ls.new_level(asset_path, True):
            raise RuntimeError(
                "Impossible de créer la map Hub 3B. Vérifier que le projet n'est pas en mode PIE "
                "et que /Game/3binternational/Maps est accessible."
            )

    actual_name = current_level_name()
    if actual_name != expected_name:
        raise RuntimeError(
            f"SÉCURITÉ: la map courante est '{actual_name or 'inconnue'}' au lieu de "
            f"'{expected_name}'. Construction annulée pour ne pas modifier une autre map."
        )

    log(f"Map Hub 3B confirmée: {actual_name}")


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
    subsystem = actor_subsystem()
    tag_name = unreal.Name(tag)
    removed = 0
    for actor in subsystem.get_all_level_actors():
        try:
            if tag_name in list(actor.tags):
                subsystem.destroy_actor(actor)
                removed += 1
        except Exception:
            continue
    log(f"{removed} ancien(s) acteur(s) Hub V3 supprimé(s)")


def spawn_box(label, center_cm, size_cm, yaw_deg, tag, folder, pitch_deg=0.0):
    cube = unreal.load_asset(CUBE_PATH)
    if not cube:
        raise RuntimeError(f"Mesh moteur introuvable: {CUBE_PATH}")

    subsystem = actor_subsystem()
    actor = subsystem.spawn_actor_from_class(
        unreal.StaticMeshActor,
        unreal.Vector(float(center_cm[0]), float(center_cm[1]), float(center_cm[2])),
        unreal.Rotator(float(pitch_deg), float(yaw_deg), 0.0),
        transient=False,
    )
    if not actor:
        raise RuntimeError(f"Impossible de créer {label}")

    actor.static_mesh_component.set_static_mesh(cube)
    actor.set_actor_scale3d(
        unreal.Vector(
            max(0.01, float(size_cm[0]) / 100.0),
            max(0.01, float(size_cm[1]) / 100.0),
            max(0.01, float(size_cm[2]) / 100.0),
        )
    )
    return mark(actor, label, tag, folder)


def spawn_platform(platform, tag):
    pid = platform["id"]
    x, y = platform["center_cm"]
    sx, sy = platform["size_cm"]
    surface_z = float(platform["surface_z_cm"])
    thickness = float(platform["thickness_cm"])
    yaw = float(platform["yaw_deg"])
    kind = platform["kind"].upper()

    top_center = [x, y, surface_z - thickness * 0.5]
    spawn_box(
        f"HUB_{kind}_{pid}_TOP",
        top_center,
        [sx, sy, thickness],
        yaw,
        tag,
        f"HUB_3B/GEO_PLAYABLE/{kind}",
    )

    bottom = surface_z - thickness
    for index, tier in enumerate(platform.get("underside_tiers", []), start=1):
        scale_x, scale_y, depth = tier
        depth = float(depth)
        center_z = bottom - depth * 0.5
        spawn_box(
            f"HUB_{kind}_{pid}_UNDER_{index}",
            [x, y, center_z],
            [float(sx) * float(scale_x), float(sy) * float(scale_y), depth],
            yaw,
            tag,
            "HUB_3B/GEO_UNDERSIDE",
        )
        bottom -= depth


def edge_point(a, b, from_side=True):
    ax, ay = a["center_cm"]
    bx, by = b["center_cm"]
    dx = float(bx - ax)
    dy = float(by - ay)
    distance = math.hypot(dx, dy)
    if distance <= 0.001:
        raise RuntimeError(f"Connexion invalide entre {a['id']} et {b['id']}")
    ux = dx / distance
    uy = dy / distance
    radius = float(a["bridge_radius_cm"] if from_side else b["bridge_radius_cm"])
    if from_side:
        return (float(ax) + ux * radius, float(ay) + uy * radius, float(a["surface_z_cm"]))
    return (float(bx) - ux * radius, float(by) - uy * radius, float(b["surface_z_cm"]))


def spawn_connection(connection, by_id, tag):
    a = by_id[connection["from"]]
    b = by_id[connection["to"]]
    start = edge_point(a, b, True)
    end = edge_point(a, b, False)

    dx = end[0] - start[0]
    dy = end[1] - start[1]
    dz = end[2] - start[2]
    horizontal = math.hypot(dx, dy)
    length = math.sqrt(horizontal * horizontal + dz * dz)
    yaw = math.degrees(math.atan2(dy, dx))
    pitch = -math.degrees(math.atan2(dz, max(horizontal, 1.0)))

    center = [
        (start[0] + end[0]) * 0.5,
        (start[1] + end[1]) * 0.5,
        (start[2] + end[2]) * 0.5 - 45.0,
    ]

    spawn_box(
        f"HUB_BRIDGE_{connection['id']}",
        center,
        [length, float(connection["width_cm"]), 90.0],
        yaw,
        tag,
        "HUB_3B/GEO_BRIDGES",
        pitch_deg=pitch,
    )


def spawn_target(label, location, tag, folder):
    actor = actor_subsystem().spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(float(location[0]), float(location[1]), float(location[2])),
        unreal.Rotator(0.0, 0.0, 0.0),
        transient=False,
    )
    if actor:
        return mark(actor, label, tag, folder)
    warn(f"Impossible de créer {label}")
    return None


def spawn_player_start(core, tag):
    location = unreal.Vector(
        float(core["center_cm"][0]),
        float(core["center_cm"][1]),
        float(core["surface_z_cm"]) + 160.0,
    )
    actor = actor_subsystem().spawn_actor_from_class(
        unreal.PlayerStart,
        location,
        unreal.Rotator(0.0, 0.0, 0.0),
        transient=False,
    )
    if actor:
        mark(actor, "HUB_PLAYER_START", tag, "HUB_3B/SAFE_ANCHORS")


def remove_landscapes_or_abort():
    actual_name = current_level_name()
    if actual_name != "Hub3B_Blockout_V01":
        raise RuntimeError(
            f"SÉCURITÉ: suppression Landscape interdite dans la map '{actual_name}'."
        )

    landscapes = []
    for actor in actor_subsystem().get_all_level_actors():
        try:
            if "Landscape" in actor.get_class().get_name():
                landscapes.append(actor)
        except Exception:
            pass

    if landscapes:
        warn(f"{len(landscapes)} Landscape détecté(s) dans la map Hub dédiée: suppression.")
        for actor in landscapes:
            try:
                actor_subsystem().destroy_actor(actor)
            except Exception as exc:
                raise RuntimeError(f"Impossible de supprimer un Landscape du Hub: {exc}")


def remove_existing_environment_actor(class_name):
    cls = getattr(unreal, class_name, None)
    if cls is None:
        return
    for actor in actor_subsystem().get_all_level_actors():
        try:
            if actor.get_class() == cls:
                actor_subsystem().destroy_actor(actor)
        except Exception:
            pass


def spawn_environment(tag):
    specs = [
        ("DirectionalLight", "HUB_ENV_SUN", [0, 0, 5000], [-35, -25, 0]),
        ("SkyLight", "HUB_ENV_SKYLIGHT", [0, 0, 2500], [0, 0, 0]),
        ("SkyAtmosphere", "HUB_ENV_SKYATMOSPHERE", [0, 0, 0], [0, 0, 0]),
        ("ExponentialHeightFog", "HUB_ENV_HEIGHTFOG", [0, 0, -3000], [0, 0, 0]),
        ("VolumetricCloud", "HUB_ENV_VOLUMETRIC_CLOUD", [0, 0, -7000], [0, 0, 0]),
    ]
    subsystem = actor_subsystem()
    for class_name, label, loc, rot in specs:
        remove_existing_environment_actor(class_name)
        cls = getattr(unreal, class_name, None)
        if cls is None:
            warn(f"Classe environnement indisponible: {class_name}")
            continue
        try:
            actor = subsystem.spawn_actor_from_class(
                cls,
                unreal.Vector(float(loc[0]), float(loc[1]), float(loc[2])),
                unreal.Rotator(float(rot[0]), float(rot[1]), float(rot[2])),
                transient=False,
            )
            if actor:
                mark(actor, label, tag, "HUB_3B/ENVIRONMENT")
        except Exception as exc:
            warn(f"{label} non créé: {exc}")


def configure_world(manifest):
    try:
        world = editor_subsystem().get_editor_world()
        settings = world.get_world_settings()
        settings.set_editor_property("kill_z", float(manifest["design"]["recovery_kill_z_cm"]))
        log(f"Kill Z réglé à {manifest['design']['recovery_kill_z_cm']} cm")
    except Exception as exc:
        warn(f"Kill Z non réglé automatiquement: {exc}")


def spawn_fragments(manifest, tag):
    for fragment in manifest.get("fragments", []):
        spawn_box(
            f"HUB_FRAGMENT_{fragment['id']}",
            fragment["center_cm"],
            fragment["size_cm"],
            fragment["yaw_deg"],
            tag,
            "HUB_3B/GEO_DISTANT/FRAGMENTS",
        )


def spawn_safe_anchors(manifest, by_id, tag):
    for anchor in manifest.get("safe_anchors", []):
        platform = by_id[anchor["platform"]]
        x, y = platform["center_cm"]
        z = float(platform["surface_z_cm"]) + 110.0
        spawn_target(
            f"HUB_SAFE_{anchor['id']}",
            [x, y, z],
            tag,
            "HUB_3B/SAFE_ANCHORS",
        )


def validate(manifest, tag):
    actors = actor_subsystem().get_all_level_actors()
    tagged = []
    landscapes = []
    tag_name = unreal.Name(tag)

    for actor in actors:
        try:
            if tag_name in list(actor.tags):
                tagged.append(actor)
        except Exception:
            pass
        try:
            if "Landscape" in actor.get_class().get_name():
                landscapes.append(actor)
        except Exception:
            pass

    labels = []
    for actor in tagged:
        try:
            labels.append(actor.get_actor_label())
        except Exception:
            pass

    required_platforms = int(manifest["validation"]["required_platform_count"])
    required_connections = int(manifest["validation"]["required_connection_count"])
    required_anchors = int(manifest["validation"]["required_safe_anchor_count"])
    required_fragments = int(manifest["validation"]["required_fragment_count"])

    platform_tops = [x for x in labels if x.endswith("_TOP")]
    bridges = [x for x in labels if x.startswith("HUB_BRIDGE_")]
    anchors = [x for x in labels if x.startswith("HUB_SAFE_")]
    fragments = [x for x in labels if x.startswith("HUB_FRAGMENT_")]

    checks = {
        "platforms": len(platform_tops) == required_platforms,
        "bridges": len(bridges) == required_connections,
        "anchors": len(anchors) == required_anchors,
        "fragments": len(fragments) == required_fragments,
        "no_landscape": len(landscapes) == 0 if manifest["validation"].get("forbid_landscape") else True,
    }

    log(
        "Validation: "
        f"{len(platform_tops)}/{required_platforms} plateformes, "
        f"{len(bridges)}/{required_connections} ponts, "
        f"{len(anchors)}/{required_anchors} safe anchors, "
        f"{len(fragments)}/{required_fragments} fragments, "
        f"{len(landscapes)} Landscape."
    )

    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        warn("Contrôles à revoir: " + ", ".join(failed))
        return False

    log("VALIDATION BLOCKOUT V3: OK")
    return True


def frame_editor_view():
    try:
        editor_subsystem().set_level_viewport_camera_info(
            unreal.Vector(-10500.0, -10500.0, 8500.0),
            unreal.Rotator(-28.0, 45.0, 0.0),
        )
    except Exception as exc:
        warn(f"Caméra de présentation non réglée: {exc}")


def build():
    manifest = load_manifest()
    map_asset = manifest["map_asset"]
    tag = manifest["generated_tag"]

    log("=== Construction premium du Hub 3B V3 ===")
    log("Le terrain actuel n'est pas modifié: une map dédiée est utilisée.")

    open_or_create_level(map_asset)
    remove_landscapes_or_abort()
    destroy_previous(tag)

    by_id = {platform["id"]: platform for platform in manifest["platforms"]}

    total_steps = (
        len(manifest["platforms"])
        + len(manifest["connections"])
        + len(manifest.get("fragments", []))
        + len(manifest.get("safe_anchors", []))
        + 4
    )

    with unreal.ScopedSlowTask(total_steps, "Construction du Hub 3B — vides et plateformes") as task:
        task.make_dialog(True)

        for platform in manifest["platforms"]:
            task.enter_progress_frame(1, f"Plateforme {platform['id']}")
            spawn_platform(platform, tag)

        for connection in manifest["connections"]:
            task.enter_progress_frame(1, f"Pont {connection['id']}")
            spawn_connection(connection, by_id, tag)

        for fragment in manifest.get("fragments", []):
            task.enter_progress_frame(1, f"Fragment {fragment['id']}")
            spawn_box(
                f"HUB_FRAGMENT_{fragment['id']}",
                fragment["center_cm"],
                fragment["size_cm"],
                fragment["yaw_deg"],
                tag,
                "HUB_3B/GEO_DISTANT/FRAGMENTS",
            )

        task.enter_progress_frame(1, "Points de sécurité")
        spawn_safe_anchors(manifest, by_id, tag)
        spawn_player_start(by_id["CORE"], tag)

        task.enter_progress_frame(1, "Ciel et atmosphère")
        spawn_environment(tag)

        task.enter_progress_frame(1, "Réglages du monde")
        configure_world(manifest)

        task.enter_progress_frame(1, "Validation et sauvegarde")
        validate(manifest, tag)

    actual_name = current_level_name()
    if actual_name != map_asset.rsplit("/", 1)[-1]:
        raise RuntimeError(
            f"SÉCURITÉ: la map a changé pendant la construction ({actual_name}). "
            "Sauvegarde annulée."
        )

    if not level_subsystem().save_current_level():
        raise RuntimeError(
            "La sauvegarde automatique de Hub3B_Blockout_V01 a échoué. "
            "Ne rien sauvegarder manuellement dans une autre map."
        )

    log(f"Map sauvegardée: {map_asset}")

    frame_editor_view()

    log("=== HUB 3B V3 terminé ===")
    log("Résultat: vraie map sans Landscape, plateformes séparées, vide réel, ponts, dessous, fragments, Safe Anchors et atmosphère de base.")


if __name__ == "__main__":
    build()
