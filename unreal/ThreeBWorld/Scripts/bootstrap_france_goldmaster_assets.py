"""Bootstrap the canonical France Gold Master editor assets after C++ has compiled.

Run inside Unreal Editor 5.8 with /Game/3B/World/France/Maps/L_France_OpenWorld open.

This script:
- creates canonical directories;
- creates/updates France region, mission, population and weather Data Assets;
- creates required Data Layer Assets and world-specific Data Layer Instances when possible;
- spawns one native AThreeBWeatherDirector when the class is available;
- saves created content and the current level.

It never invents final meshes, materials, animation, Niagara, audio or navigation.
"""
from __future__ import annotations

import json
import os
from typing import Any

import unreal


FRANCE_ROOT = "/Game/3B/World/France"
DATA_DIR = f"{FRANCE_ROOT}/Data"
DATA_LAYER_DIR = f"{FRANCE_ROOT}/DataLayers"
WEATHER_TAG = unreal.Name("3B_FRANCE_WEATHER_DIRECTOR")


def project_file(*parts: str) -> str:
    return os.path.join(unreal.Paths.project_dir(), *parts)


def load_json(filename: str) -> dict[str, Any]:
    path = project_file("Data", "France", filename)
    if not os.path.exists(path):
        raise RuntimeError(f"3B France source contract missing: {path}")
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def reflected(name: str):
    value = getattr(unreal, name, None)
    if value is None:
        raise RuntimeError(
            f"Unreal reflected type '{name}' is unavailable. Compile ThreeBWorld Editor first."
        )
    return value


def safe_set(obj, property_name: str, value, *, required: bool = True) -> bool:
    try:
        obj.set_editor_property(property_name, value)
        return True
    except Exception as exc:
        if required:
            raise RuntimeError(
                f"Failed to set {obj.get_class().get_name()}.{property_name}: {exc}"
            ) from exc
        unreal.log_warning(
            f"[3B France] optional property skipped: "
            f"{obj.get_class().get_name()}.{property_name}: {exc}"
        )
        return False


def make_name(value: str | None) -> unreal.Name:
    return unreal.Name(str(value or ""))


def make_vector(data: dict[str, Any]) -> unreal.Vector:
    return unreal.Vector(
        float(data.get("x", 0.0)),
        float(data.get("y", 0.0)),
        float(data.get("z", 0.0)),
    )


def ensure_directories(manifest: dict[str, Any]) -> None:
    for directory in manifest.get("directories", []):
        if not unreal.EditorAssetLibrary.does_directory_exist(directory):
            if not unreal.EditorAssetLibrary.make_directory(directory):
                raise RuntimeError(f"Unable to create Content Browser directory: {directory}")


def create_or_load_data_asset(asset_name: str, package_path: str, class_name: str):
    asset_path = f"{package_path}/{asset_name}"
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        asset = unreal.EditorAssetLibrary.load_asset(asset_path)
        if not asset:
            raise RuntimeError(f"Unable to load existing asset: {asset_path}")
        return asset

    asset_class = reflected(class_name)
    factory = unreal.DataAssetFactory()
    safe_set(factory, "data_asset_class", asset_class)

    asset = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        asset_name=asset_name,
        package_path=package_path,
        asset_class=asset_class,
        factory=factory,
    )
    if not asset:
        raise RuntimeError(f"Unable to create asset: {asset_path}")
    return asset


def create_or_load_data_layer(asset_path: str):
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        asset = unreal.EditorAssetLibrary.load_asset(asset_path)
        if not asset:
            raise RuntimeError(f"Unable to load Data Layer asset: {asset_path}")
        return asset

    package_path, asset_name = asset_path.rsplit("/", 1)
    asset = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        asset_name=asset_name,
        package_path=package_path,
        asset_class=unreal.DataLayerAsset,
        factory=unreal.DataLayerFactory(),
    )
    if not asset:
        raise RuntimeError(f"Unable to create Data Layer asset: {asset_path}")

    if hasattr(asset, "set_type"):
        asset.set_type(unreal.DataLayerType.RUNTIME)
    return asset


def fill_region_asset(asset, layout: dict[str, Any]) -> None:
    safe_set(asset, "region_id", make_name("france"))
    safe_set(asset, "schema_version", 2)

    band_cls = reflected("ThreeBAltitudeBandDefinition")
    bands = []
    for item in layout["altitude_bands"]:
        value = band_cls()
        safe_set(value, "id", make_name(item["id"]))
        safe_set(value, "height_cm", float(item["z_cm"]))
        safe_set(value, "purpose", item.get("purpose", ""), required=False)
        bands.append(value)
    safe_set(asset, "altitude_bands", bands)

    district_cls = reflected("ThreeBDistrictDefinition")
    districts = []
    for item in layout["districts"]:
        value = district_cls()
        safe_set(value, "id", make_name(item["id"]))
        safe_set(value, "display_name", item.get("label", ""), required=False)
        safe_set(value, "altitude_band_id", make_name(item["altitude_band"]))
        safe_set(value, "data_layer_name", make_name(item["data_layer"]))
        safe_set(value, "anchor_location", make_vector(item["location_cm"]))
        safe_set(value, "population_budget", int(item["population_budget"]))
        safe_set(value, "visual_rule", item.get("visual_rule", ""), required=False)
        districts.append(value)
    safe_set(asset, "districts", districts)

    hydro_cls = reflected("ThreeBHydrologyLinkDefinition")
    links = []
    chain = layout.get("hydrology", {}).get("origin_chain", [])
    for index, (from_node, to_node) in enumerate(zip(chain, chain[1:]), start=1):
        value = hydro_cls()
        safe_set(value, "id", make_name(f"hydro_{index:02d}_{from_node}_to_{to_node}"))
        safe_set(value, "from_node", make_name(from_node))
        safe_set(value, "to_node", make_name(to_node))
        safe_set(value, "kind", make_name("water_network"))
        safe_set(value, "b_gameplay_critical", to_node in {"monumental_waterfall", "lower_basin"})
        links.append(value)
    safe_set(asset, "hydrology_links", links)

    vista_cls = reflected("ThreeBVistaDefinition")
    vistas = []
    for item in layout.get("vistas", []):
        value = vista_cls()
        safe_set(value, "id", make_name(item["id"]))
        safe_set(value, "location", make_vector(item["location_cm"]))
        safe_set(value, "target", make_vector(item["target_cm"]))
        safe_set(
            value,
            "required_visible_altitude_bands",
            [make_name(x) for x in item.get("required_visible_bands", [])],
        )
        safe_set(value, "landmark_id", make_name(item.get("landmark")))
        vistas.append(value)
    safe_set(asset, "vistas", vistas)

    streaming_cls = reflected("ThreeBRegionStreamingProfile")
    streaming = streaming_cls()
    stream_source = layout["streaming"]
    safe_set(streaming, "target_cell_cm", int(stream_source["target_cell_cm"]))
    safe_set(
        streaming,
        "desktop_initial_active_cells_max",
        int(stream_source["desktop_initial_active_cells_max"]),
    )
    safe_set(
        streaming,
        "active_ai_controller_budget",
        int(load_json("france-npc-dialogue-v1.json")["population_rules"]["active_ai_controller_budget"]),
    )
    safe_set(
        streaming,
        "always_visible_proxy_ids",
        [make_name(x) for x in stream_source.get("always_visible_proxies", [])],
    )
    safe_set(asset, "streaming", streaming)


def fill_mission_catalog(asset, missions_source: dict[str, Any]) -> None:
    safe_set(asset, "catalog_id", make_name("france_district_missions"))
    safe_set(asset, "schema_version", 1)

    mission_cls = reflected("ThreeBMissionDefinitionEntry")
    objective_cls = reflected("ThreeBMissionObjectiveDefinition")
    authority_enum = reflected("ThreeBMissionAuthority")

    missions = []
    for item in missions_source.get("missions", []):
        mission = mission_cls()
        safe_set(mission, "id", make_name(item["id"]))
        safe_set(mission, "title", item.get("title", ""), required=False)
        safe_set(mission, "district_id", make_name(item["district_id"]))
        safe_set(
            mission,
            "available_phase_ids",
            [make_name(x) for x in item.get("available_phases", [])],
        )

        objectives = []
        for index, text in enumerate(item.get("objectives", []), start=1):
            objective = objective_cls()
            safe_set(objective, "id", make_name(f"objective_{index:02d}"))
            safe_set(objective, "display_name", text, required=False)
            objectives.append(objective)
        safe_set(mission, "objectives", objectives)

        safe_set(mission, "reward_policy_key", make_name(item["reward_policy_key"]))
        safe_set(mission, "authority", authority_enum.SERVER_VERIFIED)
        consequence = item.get("consequence")
        safe_set(
            mission,
            "consequence_keys",
            [make_name(consequence)] if consequence else [],
        )
        missions.append(mission)

    safe_set(asset, "missions", missions)


def fill_population_asset(asset, source: dict[str, Any]) -> None:
    rules = source["population_rules"]
    safe_set(asset, "population_id", make_name("france_population"))
    safe_set(asset, "active_ai_controller_budget", int(rules["active_ai_controller_budget"]))

    tier_cls = reflected("ThreeBPopulationSimulationTier")
    tiers = []
    for item in rules["simulation_tiers"]:
        value = tier_cls()
        safe_set(value, "id", make_name(item["id"]))
        safe_set(value, "max_distance_cm", float(item["distance_cm"]))
        safe_set(value, "mode", make_name(item["mode"]))
        tiers.append(value)
    safe_set(asset, "simulation_tiers", tiers)

    routine_cls = reflected("ThreeBPopulationRoutineProfile")
    routines = []
    for item in source["routine_profiles"]:
        value = routine_cls()
        safe_set(value, "id", make_name(item["id"]))
        for slot in ("morning", "day", "evening", "night"):
            safe_set(value, slot, make_name(item["slots"][slot]))
        routines.append(value)
    safe_set(asset, "routine_profiles", routines)

    archetype_cls = reflected("ThreeBPopulationArchetype")
    archetypes = []
    for item in source["population_archetypes"]:
        value = archetype_cls()
        safe_set(value, "district_id", make_name(item["district_id"]))
        safe_set(value, "target_population", int(item["target_population"]))
        safe_set(value, "roles", [make_name(x) for x in item["roles"]])
        archetypes.append(value)
    safe_set(asset, "archetypes", archetypes)


def fill_weather_asset(asset, source: dict[str, Any]) -> None:
    safe_set(asset, "profile_id", make_name("france_weather"))
    weather_enum = reflected("ThreeBWeatherState")
    safe_set(asset, "default_state", weather_enum.LOW_CLOUD)

    state_cls = reflected("ThreeBWeatherStateDefinition")
    states = []
    for item in source["weather_state_machine"]["states"]:
        state = state_cls()
        safe_set(state, "state", getattr(weather_enum, item["id"]))
        safe_set(state, "visibility", make_name(item["visibility"]))
        safe_set(state, "wetness", float(item["wetness"]))
        safe_set(state, "wind", make_name(item["wind"]))
        safe_set(state, "clouds", make_name(item["clouds"]))
        safe_set(state, "rain", make_name(item["rain"]))
        states.append(state)
    safe_set(asset, "states", states)

    altitude_cls = reflected("ThreeBAltitudeEnvironmentProfile")
    profiles = []
    for item in source["altitude_environment_profiles"]:
        value = altitude_cls()
        safe_set(value, "altitude_band_id", make_name(item["altitude_band"]))
        safe_set(value, "wind", make_name(item["wind"]))
        safe_set(value, "fog", make_name(item["fog"]))
        safe_set(value, "audio_profile", make_name(item["audio"]))
        safe_set(value, "cloud_relation", make_name(item["cloud_relation"]))
        profiles.append(value)
    safe_set(asset, "altitude_profiles", profiles)


def ensure_data_layer_instances(data_layers: list[Any]) -> None:
    subsystem_cls = getattr(unreal, "DataLayerEditorSubsystem", None)
    params_cls = getattr(unreal, "DataLayerCreationParameters", None)
    if subsystem_cls is None or params_cls is None:
        unreal.log_warning("[3B France] Data Layer Editor API unavailable; assets created, instances skipped.")
        return

    subsystem = unreal.get_editor_subsystem(subsystem_cls)
    for asset in data_layers:
        try:
            existing = subsystem.get_data_layer_instance(asset)
            if existing:
                continue
            params = params_cls()
            safe_set(params, "data_layer_asset", asset)
            safe_set(params, "is_private", False)
            created = subsystem.create_data_layer_instance(params)
            if not created:
                unreal.log_warning(
                    f"[3B France] Could not create Data Layer instance for {asset.get_name()}"
                )
        except Exception as exc:
            unreal.log_warning(
                f"[3B France] Data Layer instance skipped for {asset.get_name()}: {exc}"
            )


def ensure_weather_director(weather_asset) -> None:
    actor_class = getattr(unreal, "ThreeBWeatherDirector", None)
    if actor_class is None:
        raise RuntimeError("ThreeBWeatherDirector reflected class unavailable after compile.")

    subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    existing = None
    for actor in subsystem.get_all_level_actors():
        if WEATHER_TAG in list(actor.tags):
            existing = actor
            break

    if existing is None:
        existing = subsystem.spawn_actor_from_class(
            actor_class,
            unreal.Vector(0.0, 0.0, 16000.0),
            unreal.Rotator(0.0, 0.0, 0.0),
            transient=False,
        )
        if not existing:
            raise RuntimeError("Unable to spawn AThreeBWeatherDirector.")
        existing.set_actor_label("3B_FR_WEATHER_DIRECTOR")
        existing.tags = list(existing.tags) + [WEATHER_TAG]

    safe_set(existing, "weather_profile", weather_asset)


def save_asset(asset) -> None:
    if not unreal.EditorAssetLibrary.save_loaded_asset(asset, only_if_is_dirty=False):
        raise RuntimeError(f"Unable to save asset: {asset.get_path_name()}")


def main() -> None:
    manifest = load_json("france-editor-asset-manifest.json")
    layout = load_json("france-blockout-layout.json")
    missions = load_json("france-district-missions-v1.json")
    population = load_json("france-npc-dialogue-v1.json")
    presentation = load_json("france-presentation-v1.json")

    ensure_directories(manifest)

    region_asset = create_or_load_data_asset(
        "DA_FranceRegion", DATA_DIR, "ThreeBRegionDefinition"
    )
    mission_asset = create_or_load_data_asset(
        "DA_FranceMissions", DATA_DIR, "ThreeBMissionCatalog"
    )
    population_asset = create_or_load_data_asset(
        "DA_FrancePopulation", DATA_DIR, "ThreeBPopulationDefinition"
    )
    weather_asset = create_or_load_data_asset(
        "DA_FranceWeather", DATA_DIR, "ThreeBWeatherProfile"
    )

    fill_region_asset(region_asset, layout)
    fill_mission_catalog(mission_asset, missions)
    fill_population_asset(population_asset, population)
    fill_weather_asset(weather_asset, presentation)

    created_layers = []
    for entry in manifest.get("required_assets", []):
        if entry.get("kind") == "DataLayerAsset":
            created_layers.append(create_or_load_data_layer(entry["path"]))

    ensure_data_layer_instances(created_layers)
    ensure_weather_director(weather_asset)

    for asset in [region_asset, mission_asset, population_asset, weather_asset, *created_layers]:
        save_asset(asset)

    level_subsystem = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    if not level_subsystem.save_current_level():
        unreal.log_warning("[3B France] Current level could not be saved automatically.")

    unreal.log(
        "[3B France] bootstrap complete: "
        f"{len(created_layers)} Data Layers + region/missions/population/weather assets."
    )


if __name__ == "__main__":
    main()
