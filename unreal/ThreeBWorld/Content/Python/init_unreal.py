import os
import traceback
import unreal

_FLAG = "-3BHubAutoBuild"
_STATE = {"elapsed": 0.0, "handle": None, "started": False}


def _log(message):
    unreal.log(f"[3B AUTO] {message}")


def _log_error(message):
    unreal.log_error(f"[3B AUTO] {message}")


def _has_flag():
    try:
        command_line = unreal.SystemLibrary.get_command_line()
    except Exception:
        command_line = ""
    return _FLAG.lower() in str(command_line).lower()


def _builder_path():
    return os.path.join(
        unreal.Paths.project_dir(),
        "Scripts",
        "build_hub3b_void_blockout_v3.py",
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
        _log("Construction automatique terminee. La map Hub3B_Blockout_V01 doit etre ouverte.")
    except Exception:
        _log_error("La construction automatique a echoue:\n" + traceback.format_exc())


if _has_flag():
    _log("Mode lancement automatique Hub 3B detecte. Attente de l'initialisation de l'editeur...")
    try:
        _STATE["handle"] = unreal.register_slate_post_tick_callback(_tick)
    except Exception:
        _log_error("Impossible d'enregistrer le callback de demarrage:\n" + traceback.format_exc())
