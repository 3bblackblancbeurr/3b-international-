"""One-command France Gold Master preparation pass inside Unreal Editor 5.8.

Order:
1. bootstrap canonical Data Assets / Data Layers / Weather Director;
2. generate the reversible vertical blockout;
3. run the strict read-only validator.

The validator is expected to fail until all remaining critical assets
(Céliane, input assets, real maps, etc.) have actually been authored.
"""
from __future__ import annotations

import importlib
import os
import sys

import unreal


SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)


def run_module(name: str, function: str = "main") -> None:
    module = importlib.import_module(name)
    module = importlib.reload(module)
    target = getattr(module, function)
    target()


def main() -> None:
    unreal.log("[3B France] Gold Master preparation starting.")
    run_module("bootstrap_france_goldmaster_assets")
    run_module("build_france_blockout", "build")
    try:
        run_module("validate_france_editor_assets")
    except Exception as exc:
        unreal.log_warning(
            "[3B France] Preparation completed, strict validator still reports "
            f"real missing Editor work: {exc}"
        )
    unreal.log("[3B France] Gold Master preparation pass finished.")


if __name__ == "__main__":
    main()
