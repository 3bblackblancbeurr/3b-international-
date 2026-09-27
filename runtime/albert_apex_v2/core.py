from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import threading
import time
import uuid
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

VERSION = "2.0.0"
PHASES = ("INTENT", "ASSESS", "PLAN", "EXECUTE", "REVIEW", "VERIFY", "EVIDENCE")

CONSTITUTION = (
    "Ne jamais annoncer un succès sans preuve vérifiable.",
    "Préférer le local pour les données sensibles ou privées.",
    "Toute action inconnue est refusée par défaut.",
    "Les actions externes, destructives ou financières exigent une validation explicite.",
    "Une phase annulée ou échouée ne débloque jamais la suivante.",
    "Conserver une trace inspectable des décisions, changements, tests et preuves.",
    "Changer de stratégie après des échecs répétés au lieu de boucler.",
    "Limiter chaque agent, skill et outil au moindre privilège nécessaire.",
)

ACTION_POLICY: Dict[str, Dict[str, Any]] = {
    "read": {"level": 0, "approval": False, "reversible": True},
    "search": {"level": 0, "approval": False, "reversible": True},
    "inspect": {"level": 0, "approval": False, "reversible": True},
    "open_view": {"level": 0, "approval": False, "reversible": True},
    "open_app": {"level": 1, "approval": False, "reversible": True},
    "run_test": {"level": 1, "approval": False, "reversible": True},
    "generate_preview": {"level": 1, "approval": False, "reversible": True},
    "create_file": {"level": 2, "approval": True, "reversible": True},
    "update_file": {"level": 2, "approval": True, "reversible": True},
    "install_skill": {"level": 2, "approval": True, "reversible": True},
    "calendar_write": {"level": 3, "approval": True, "reversible": True},
    "send_message": {"level": 3, "approval": True, "reversible": False},
    "publish": {"level": 3, "approval": True, "reversible": False},
    "push": {"level": 3, "approval": True, "reversible": True},
    "deploy": {"level": 3, "approval": True, "reversible": True},
    "delete": {"level": 4, "approval": True, "reversible": False},
    "payment": {"level": 4, "approval": True, "reversible": False},
    "transfer": {"level": 4, "approval": True, "reversible": False},
    "rotate_secret": {"level": 4, "approval": True, "reversible": False},
    "production_migration": {"level": 4, "approval": True, "reversible": False},
}


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def clean_text(value: Any, limit: int = 4000) -> str:
    text = re.sub(r"[\x00-\x1f]+", " ", str(value or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text[:limit]


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temp, path)


def read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def task_id() -> str:
    return "task-" + uuid.uuid4().hex[:16]


@dataclass(frozen=True)
class TypedAction:
    action: str
    level: int
    approval_required: bool
    reversible: bool
    payload: Dict[str, Any]

    @classmethod
    def build(cls, action: str, payload: Optional[Dict[str, Any]] = None) -> "TypedAction":
        policy = ACTION_POLICY.get(action)
        if policy is None:
            raise ValueError("Action APEX inconnue: refus fail-closed.")
        return cls(
            action=action,
            level=int(policy["level"]),
            approval_required=bool(policy["approval"]),
            reversible=bool(policy["reversible"]),
            payload=dict(payload or {}),
        )


class SpecCompiler:
    @staticmethod
    def classify(intent: str) -> str:
        q = clean_text(intent, 1200).lower()
        if any(word in q for word in ("bug", "erreur", "corrige", "répare", "repare")):
            return "bugfix"
        if any(word in q for word in ("image", "vidéo", "video", "manga", "teaser", "visuel")):
            return "creative"
        if any(word in q for word in ("code", "fonction", "application", "module", "api", "test")):
            return "development"
        if any(word in q for word in ("mail", "agenda", "facture", "client", "devis")):
            return "operations"
        return "general"

    @classmethod
    def compile(cls, intent: str, project: str = "ALBERT") -> Dict[str, Any]:
        clean = clean_text(intent, 4000)
        if not clean:
            raise ValueError("Intention vide.")
        return {
            "version": 1,
            "project": clean_text(project, 120),
            "kind": cls.classify(clean),
            "intent": clean,
            "constraints": [
                "least_privilege",
                "evidence_before_success",
                "reversible_when_possible",
                "no_unverified_external_action",
            ],
            "acceptance": [
                "execution_recorded",
                "verification_recorded",
                "evidence_recorded",
            ],
            "created_at": now_iso(),
            "frozen": True,
        }


class MetacognitiveSupervisor:
    @staticmethod
    def inspect(history: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
        rows = list(history)[-20:]
        labels = [clean_text(row.get("label"), 300).lower() for row in rows]
        repeated = False
        if len(labels) >= 3 and labels[-1] and labels[-1] == labels[-2] == labels[-3]:
            repeated = True
        recent_failures = sum(1 for row in rows[-5:] if row.get("status") == "failed")
        return {
            "loop_detected": repeated,
            "recent_failures": recent_failures,
            "strategy_switch": repeated or recent_failures >= 2,
            "checked_at": now_iso(),
        }


class ModelRegistry:
    @staticmethod
    def _fixed(command: str, args: List[str], timeout: float = 4.0) -> str:
        try:
            result = subprocess.run(
                [command, *args],
                capture_output=True,
                text=True,
                timeout=timeout,
                shell=False,
                check=False,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            return (result.stdout or "").strip() if result.returncode == 0 else ""
        except Exception:
            return ""

    @classmethod
    def ollama_models(cls) -> List[str]:
        raw = cls._fixed("ollama", ["list"])
        if not raw:
            return []
        models: List[str] = []
        for line in raw.splitlines()[1:]:
            name = line.strip().split()[0] if line.strip() else ""
            if name:
                models.append(name)
        return models[:32]

    @classmethod
    def gpu(cls) -> Dict[str, Any]:
        raw = cls._fixed(
            "nvidia-smi",
            [
                "--query-gpu=name,memory.used,memory.total,temperature.gpu,utilization.gpu",
                "--format=csv,noheader,nounits",
            ],
            timeout=3.0,
        )
        if not raw:
            return {}
        row = raw.splitlines()[0].split(",")
        if len(row) < 5:
            return {}
        def number(value: str) -> Optional[float]:
            try:
                return float(value.strip())
            except Exception:
                return None
        return {
            "name": row[0].strip(),
            "memory_used_mb": number(row[1]),
            "memory_total_mb": number(row[2]),
            "temperature_c": number(row[3]),
            "utilization_percent": number(row[4]),
        }

    @classmethod
    def choose(cls, capability: str, mode: str, models: Optional[List[str]] = None) -> Dict[str, Any]:
        available = list(models if models is not None else cls.ollama_models())
        cap = clean_text(capability, 80).lower() or "chat"
        mode = mode if mode in {"AUTO", "LOCAL", "HYBRID", "INTERNET"} else "AUTO"
        preferences = {
            "vision": ("qwen3-vl", "qwen-vl", "vl"),
            "reasoning": ("qwen3.5", "qwen3", "deepseek"),
            "code": ("qwen3.5", "qwen3", "coder"),
            "chat": ("qwen3.5", "qwen3"),
        }
        chosen = None
        for hint in preferences.get(cap, preferences["chat"]):
            chosen = next((model for model in available if hint in model.lower()), None)
            if chosen:
                break
        if not chosen and available:
            chosen = available[0]
        route = "local" if chosen and mode != "INTERNET" else "external"
        if mode == "LOCAL" and not chosen:
            route = "blocked"
        return {
            "capability": cap,
            "mode": mode,
            "route": route,
            "model": chosen,
            "available_models": available,
            "selected_at": now_iso(),
        }


class ResourceGovernor:
    PROFILES = {
        "ECO": {"max_heavy_tasks": 1, "max_parallel_tasks": 1, "gpu_headroom_mb": 3500},
        "NORMAL": {"max_heavy_tasks": 1, "max_parallel_tasks": 2, "gpu_headroom_mb": 2200},
        "APEX": {"max_heavy_tasks": 2, "max_parallel_tasks": 4, "gpu_headroom_mb": 1200},
    }

    @classmethod
    def policy(cls, profile: str) -> Dict[str, Any]:
        profile = profile if profile in cls.PROFILES else "NORMAL"
        return {"profile": profile, **cls.PROFILES[profile]}


class ApexStore:
    def __init__(self, runtime_root: Path):
        self.runtime_root = runtime_root
        self.data_root = runtime_root / "data" / "apex_v2"
        self.tasks_path = self.data_root / "tasks.json"
        self.events_path = self.data_root / "events.json"
        self.session_path = self.data_root / "session.json"
        self.skills_path = self.data_root / "skills.json"
        self.settings_path = self.data_root / "settings.json"
        self._lock = threading.RLock()
        self.data_root.mkdir(parents=True, exist_ok=True)
        if not self.settings_path.exists():
            atomic_json(self.settings_path, {"mode": "AUTO", "resource_profile": "NORMAL", "kill_switch": False})

    def settings(self) -> Dict[str, Any]:
        value = read_json(self.settings_path, {})
        return {
            "mode": value.get("mode") if value.get("mode") in {"AUTO", "LOCAL", "HYBRID", "INTERNET"} else "AUTO",
            "resource_profile": value.get("resource_profile") if value.get("resource_profile") in {"ECO", "NORMAL", "APEX"} else "NORMAL",
            "kill_switch": bool(value.get("kill_switch", False)),
        }

    def update_settings(self, **changes: Any) -> Dict[str, Any]:
        with self._lock:
            value = self.settings()
            if "mode" in changes and changes["mode"] in {"AUTO", "LOCAL", "HYBRID", "INTERNET"}:
                value["mode"] = changes["mode"]
            if "resource_profile" in changes and changes["resource_profile"] in {"ECO", "NORMAL", "APEX"}:
                value["resource_profile"] = changes["resource_profile"]
            if "kill_switch" in changes:
                value["kill_switch"] = bool(changes["kill_switch"])
            atomic_json(self.settings_path, value)
            return value

    def tasks(self) -> List[Dict[str, Any]]:
        return read_json(self.tasks_path, [])

    def save_tasks(self, tasks: List[Dict[str, Any]]) -> None:
        atomic_json(self.tasks_path, tasks[-250:])

    def events(self) -> List[Dict[str, Any]]:
        return read_json(self.events_path, [])

    def emit(self, event_type: str, payload: Optional[Dict[str, Any]] = None, priority: str = "normal") -> Dict[str, Any]:
        event = {
            "id": "event-" + uuid.uuid4().hex[:16],
            "type": clean_text(event_type, 120),
            "priority": priority if priority in {"quiet", "normal", "attention", "critical"} else "normal",
            "payload": dict(payload or {}),
            "created_at": now_iso(),
        }
        with self._lock:
            rows = self.events()
            rows.append(event)
            atomic_json(self.events_path, rows[-500:])
        return event


class ApexRuntime:
    def __init__(self, runtime_root: Optional[str] = None):
        root = Path(runtime_root or os.getenv("ALBERT_RUNTIME_ROOT") or Path(__file__).resolve().parents[1])
        self.root = root.resolve()
        self.store = ApexStore(self.root)

    def constitution(self) -> Dict[str, Any]:
        return {"version": 2, "principles": list(CONSTITUTION)}

    def begin_task(self, intent: str, project: str = "ALBERT") -> Dict[str, Any]:
        settings = self.store.settings()
        if settings["kill_switch"]:
            raise RuntimeError("STOP ALBERT est actif.")
        task = {
            "id": task_id(),
            "intent": clean_text(intent, 4000),
            "spec": SpecCompiler.compile(intent, project),
            "status": "running",
            "phase_index": 0,
            "phase": PHASES[0],
            "history": [{"phase": PHASES[0], "label": "Intention enregistrée", "status": "ok", "at": now_iso()}],
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "evidence": None,
            "error": None,
        }
        rows = self.store.tasks()
        rows.append(task)
        self.store.save_tasks(rows)
        self.store.emit("task.created", {"task_id": task["id"], "kind": task["spec"]["kind"]})
        return task

    def _update(self, task_id_value: str, updater) -> Dict[str, Any]:
        with self.store._lock:
            rows = self.store.tasks()
            index = next((i for i, row in enumerate(rows) if row.get("id") == task_id_value), -1)
            if index < 0:
                raise KeyError("Tâche APEX introuvable.")
            current = dict(rows[index])
            updated = updater(current)
            updated["updated_at"] = now_iso()
            rows[index] = updated
            self.store.save_tasks(rows)
            return updated

    def progress(self, task_id_value: str, phase: str, label: str) -> Dict[str, Any]:
        if phase not in PHASES:
            raise ValueError("Phase APEX invalide.")
        def apply(task: Dict[str, Any]) -> Dict[str, Any]:
            if task.get("status") != "running":
                raise RuntimeError("La tâche n’est plus active.")
            expected = int(task.get("phase_index", 0))
            requested = PHASES.index(phase)
            if requested not in {expected, expected + 1}:
                raise RuntimeError("Une phase APEX ne peut pas être sautée.")
            if requested == expected + 1:
                task["phase_index"] = requested
                task["phase"] = phase
            task.setdefault("history", []).append({"phase": phase, "label": clean_text(label, 500), "status": "ok", "at": now_iso()})
            meta = MetacognitiveSupervisor.inspect(task["history"])
            task["metacognition"] = meta
            if meta["strategy_switch"]:
                task["strategy"] = {"switch_required": True, "reason": "boucle ou échecs répétés", "at": now_iso()}
            return task
        return self._update(task_id_value, apply)

    def fail(self, task_id_value: str, error: Any) -> Dict[str, Any]:
        def apply(task: Dict[str, Any]) -> Dict[str, Any]:
            task["status"] = "failed"
            task["error"] = clean_text(error, 1200)
            task.setdefault("history", []).append({"phase": task.get("phase"), "label": task["error"], "status": "failed", "at": now_iso()})
            return task
        task = self._update(task_id_value, apply)
        self.store.emit("task.failed", {"task_id": task_id_value}, "attention")
        return task

    def cancel(self, task_id_value: str, reason: str = "Annulé") -> Dict[str, Any]:
        def apply(task: Dict[str, Any]) -> Dict[str, Any]:
            task["status"] = "cancelled"
            task["error"] = clean_text(reason, 800)
            return task
        task = self._update(task_id_value, apply)
        self.store.emit("task.cancelled", {"task_id": task_id_value}, "normal")
        return task

    def complete(self, task_id_value: str, evidence: Dict[str, Any]) -> Dict[str, Any]:
        def apply(task: Dict[str, Any]) -> Dict[str, Any]:
            if task.get("phase") != "EVIDENCE" or int(task.get("phase_index", -1)) != len(PHASES) - 1:
                raise RuntimeError("Completion refusée: EVIDENCE non atteinte.")
            checks = {
                "executed": bool(evidence.get("executed")),
                "tested": bool(evidence.get("tested")),
                "verified": bool(evidence.get("verified")),
                "documented": bool(evidence.get("documented")),
            }
            if not all(checks.values()):
                raise RuntimeError("Completion refusée: preuve incomplète.")
            payload = {
                "id": "evidence-" + uuid.uuid4().hex[:16],
                "checks": checks,
                "tests": list(evidence.get("tests") or [])[:50],
                "files": list(evidence.get("files") or [])[:100],
                "notes": clean_text(evidence.get("notes"), 3000),
                "created_at": now_iso(),
            }
            task["evidence"] = payload
            task["status"] = "verified"
            return task
        task = self._update(task_id_value, apply)
        self.store.emit("task.verified", {"task_id": task_id_value, "evidence_id": task["evidence"]["id"]})
        return task

    def propose_action(self, action: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        typed = TypedAction.build(action, payload)
        return asdict(typed)

    def need_you(self, title: str, detail: str, level: int = 3) -> Dict[str, Any]:
        row = {
            "id": "need-" + uuid.uuid4().hex[:16],
            "title": clean_text(title, 200),
            "detail": clean_text(detail, 1000),
            "level": max(0, min(4, int(level))),
            "created_at": now_iso(),
        }
        self.store.emit("approval.required", row, "attention" if row["level"] < 4 else "critical")
        return row

    def snapshot_session(self) -> Dict[str, Any]:
        tasks = self.store.tasks()
        active = [task for task in tasks if task.get("status") == "running"][-30:]
        result = {
            "id": "session-" + uuid.uuid4().hex[:12],
            "created_at": now_iso(),
            "settings": self.store.settings(),
            "active_tasks": active,
            "verified": sum(1 for task in tasks if task.get("status") == "verified"),
            "failed": sum(1 for task in tasks if task.get("status") == "failed"),
        }
        atomic_json(self.store.session_path, result)
        return result

    def status(self) -> Dict[str, Any]:
        settings = self.store.settings()
        tasks = self.store.tasks()
        models = ModelRegistry.ollama_models()
        return {
            "name": "ALBERT APEX OS V2",
            "version": VERSION,
            "runtime_root": str(self.root),
            "mode": settings["mode"],
            "resource": ResourceGovernor.policy(settings["resource_profile"]),
            "kill_switch": settings["kill_switch"],
            "constitution": self.constitution(),
            "models": models,
            "model_route": ModelRegistry.choose("chat", settings["mode"], models),
            "gpu": ModelRegistry.gpu(),
            "tasks": {
                "total": len(tasks),
                "running": sum(1 for task in tasks if task.get("status") == "running"),
                "verified": sum(1 for task in tasks if task.get("status") == "verified"),
                "failed": sum(1 for task in tasks if task.get("status") == "failed"),
                "cancelled": sum(1 for task in tasks if task.get("status") == "cancelled"),
            },
            "events": self.store.events()[-20:],
            "checked_at": now_iso(),
        }

    def stop(self) -> Dict[str, Any]:
        value = self.store.update_settings(kill_switch=True)
        self.store.emit("core.stopped", {}, "critical")
        return value

    def resume(self) -> Dict[str, Any]:
        value = self.store.update_settings(kill_switch=False)
        self.store.emit("core.resumed", {}, "normal")
        return value

    def set_mode(self, mode: str) -> Dict[str, Any]:
        return self.store.update_settings(mode=mode)

    def set_resource_profile(self, profile: str) -> Dict[str, Any]:
        return self.store.update_settings(resource_profile=profile)


def default_runtime_root() -> Path:
    local = os.getenv("LOCALAPPDATA")
    if local:
        candidate = Path(local) / "ALBERT_MAX_RUNTIME"
        if candidate.exists():
            return candidate
    return Path(__file__).resolve().parents[1]


if __name__ == "__main__":
    runtime = ApexRuntime(str(default_runtime_root()))
    print(json.dumps(runtime.status(), ensure_ascii=False, indent=2))
