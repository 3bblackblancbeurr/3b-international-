import os
import traceback
import unreal

_FLAGS = {
    "-3BHubV5AutoBuild": "build_hub3b_main_v5.py",
    "-3BHubV4AutoBuild": "build_hub3b_main_v4.py",
}
_STATE = {"elapsed": 0.0, "handle": None, "started": False, "builder": None}


def _log(message):
    unreal.log(f"[3B AUTO] {message}")


def _log_error(message):
    unreal.log_error(f"[3B AUTO] {message}")


def _selected_builder():
    try:
        command_line = str(unreal.SystemLibrary.get_command_line())
    except Exception:
        command_line = ""
    lowered = command_line.lower()
    for flag, builder in _FLAGS.items():
        if flag.lower() in lowered:
            return builder
    return None


def _has_flag():
    builder = _selected_builder()
    _STATE["builder"] = builder
    return builder is not None


def _builder_path():
    builder = _STATE.get("builder") or _selected_builder() or "build_hub3b_main_v5.py"
    return os.path.join(
        unreal.Paths.project_dir(),
        "Scripts",
        builder,
    )


def _run_builder():
    path = _builder_path()
    if not os.path.exists(path):
        raise RuntimeError(f"Constructeur Hub 3B introuvable: {path}")

    _log(f"Lancement du constructeur: {path}")
    namespace = {
        "__name__": "__main__",
        "__file__": path,
    }
    with open(path, "r", encoding="utf-8") as handle:
        source = handle.read()
    exec(compile(source, path, "exec"), namespace, namespace)


def _stop_callback():
    handle = _STATE.get("handle")
    if handle is not None:
        try:
            unreal.unregister_slate_post_tick_callback(handle)
        except Exception:
            pass
        _STATE["handle"] = None


def _tick(delta_seconds):
    if _STATE["started"]:
        return

    _STATE["elapsed"] += float(delta_seconds)

    # Laisser l'éditeur finir son initialisation et charger son premier monde.
    if _STATE["elapsed"] < 5.0:
        return

    try:
        world = unreal.get_editor_subsystem(
            unreal.UnrealEditorSubsystem
        ).get_editor_world()
        if world is None:
            return
    except Exception:
        return

    _STATE["started"] = True
    _stop_callback()

    try:
        _run_builder()
        _log("Construction automatique V4 terminee. La map Hub3B_Main_V04 doit etre ouverte.")
    except Exception:
        _log_error("La construction automatique a echoue:\n" + traceback.format_exc())


if _has_flag():
    _log("Mode lancement automatique Hub 3B V4 detecte. Attente de l'initialisation de l'editeur...")
    try:
        _STATE["handle"] = unreal.register_slate_post_tick_callback(_tick)
    except Exception:
        _log_error("Impossible d'enregistrer le callback de demarrage:\n" + traceback.format_exc())
