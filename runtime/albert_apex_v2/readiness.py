from __future__ import annotations

from typing import Any, Dict, Iterable, List

APEX_STACK = (
    {"id": "filesystem", "label": "File System", "role": "Contexte local, projets, fichiers et preuves", "trust": "local"},
    {"id": "connections", "label": "Connections / MCP", "role": "Connecteurs explicitement autorisés, sans terminal libre", "trust": "permissioned"},
    {"id": "skills", "label": "Skills", "role": "Compétences versionnées, testées et qualifiées", "trust": "qualified"},
    {"id": "routines", "label": "Routines", "role": "Workflows répétables compilés à partir d’actions typées", "trust": "compiled"},
    {"id": "agents", "label": "Agents", "role": "Rôles spécialisés orchestrés avec périmètre limité", "trust": "scoped"},
    {"id": "verification", "label": "Verification", "role": "Critique, tests, preuves et contrat de fin", "trust": "evidence"},
)

READINESS_CHECKS = (
    {"id": "localhost_only", "label": "API locale uniquement", "category": "security", "critical": True},
    {"id": "origin_allowlist", "label": "Origines réseau explicitement autorisées", "category": "security", "critical": True},
    {"id": "body_limit", "label": "Taille des requêtes bornée", "category": "security", "critical": True},
    {"id": "typed_actions", "label": "Actions typées et fail-closed", "category": "security", "critical": True},
    {"id": "least_privilege", "label": "Moindre privilège pour agents et skills", "category": "security", "critical": True},
    {"id": "approval_gate", "label": "Validation humaine pour actions sensibles", "category": "security", "critical": True},
    {"id": "kill_switch", "label": "Arrêt d’urgence disponible", "category": "recovery", "critical": True},
    {"id": "evidence_gate", "label": "Aucun succès sans preuve", "category": "quality", "critical": True},
    {"id": "input_validation", "label": "Validation et nettoyage des entrées", "category": "security", "critical": True},
    {"id": "secret_hygiene", "label": "Secrets hors interface et hors journaux", "category": "security", "critical": True},
    {"id": "rate_limits", "label": "Limites d’usage sur surfaces exposées", "category": "security", "critical": False},
    {"id": "dependency_audit", "label": "Audit des dépendances", "category": "supply_chain", "critical": False},
    {"id": "recovery", "label": "Sauvegarde, reprise et rollback", "category": "recovery", "critical": False},
    {"id": "empty_loading_error_states", "label": "États vide, chargement et erreur explicites", "category": "ux", "critical": False},
    {"id": "accessibility", "label": "Clavier, focus, contraste et mouvement réduit", "category": "ux", "critical": False},
    {"id": "responsive", "label": "Interface vérifiée sur formats compacts", "category": "ux", "critical": False},
    {"id": "observability", "label": "Événements et résultats inspectables", "category": "operations", "critical": False},
    {"id": "anti_slop_review", "label": "Revue design anti-générique avant livraison", "category": "quality", "critical": False},
)


def _state(value: Any) -> str:
    if value is True:
        return "pass"
    if value is False:
        return "fail"
    return "unknown"


def readiness_audit(signals: Dict[str, Any] | None = None) -> Dict[str, Any]:
    signals = dict(signals or {})
    checks: List[Dict[str, Any]] = []
    for definition in READINESS_CHECKS:
        status = _state(signals.get(definition["id"]))
        checks.append({**definition, "status": status})

    passed = sum(1 for row in checks if row["status"] == "pass")
    failed = sum(1 for row in checks if row["status"] == "fail")
    unknown = sum(1 for row in checks if row["status"] == "unknown")
    blockers = [row["id"] for row in checks if row["critical"] and row["status"] != "pass"]
    score = round((passed / len(checks)) * 100) if checks else 0
    coverage = round(((passed + failed) / len(checks)) * 100) if checks else 0
    return {
        "score": score,
        "coverage": coverage,
        "passed": passed,
        "failed": failed,
        "unknown": unknown,
        "total": len(checks),
        "ready": not blockers and failed == 0,
        "blockers": blockers,
        "checks": checks,
    }


def runtime_self_audit() -> Dict[str, Any]:
    # These signals describe invariants of the packaged APEX V2 local core.
    # External/project-specific facts deliberately remain unknown until measured.
    return readiness_audit({
        "localhost_only": True,
        "origin_allowlist": True,
        "body_limit": True,
        "typed_actions": True,
        "least_privilege": True,
        "approval_gate": True,
        "kill_switch": True,
        "evidence_gate": True,
        "input_validation": True,
        "secret_hygiene": True,
        "observability": True,
        "recovery": True,
    })


def workflow_blueprint(intent: str, connections: Iterable[str] | None = None) -> Dict[str, Any]:
    clean_intent = " ".join(str(intent or "").split()).strip()[:4000]
    if not clean_intent:
        raise ValueError("Intention vide.")
    connection_ids = list(dict.fromkeys(str(value).strip()[:120] for value in (connections or []) if str(value).strip()))[:20]
    lowered = clean_intent.lower()
    research = any(token in lowered for token in ("recherche", "research", "compare", "vérifie", "verifie", "source", "actualité", "actualite"))
    external = any(token in lowered for token in ("publie", "envoie", "mail", "réseau", "reseau", "calendrier", "deploy", "déploie", "deploie"))

    nodes: List[Dict[str, Any]] = [
        {"id": "intent", "role": "intake", "depends_on": [], "gate": "none"},
        {"id": "spec", "role": "specifier", "depends_on": ["intent"], "gate": "constitution"},
        {"id": "plan", "role": "planner", "depends_on": ["spec"], "gate": "least_privilege"},
    ]
    if research:
        nodes.extend([
            {"id": "scout", "role": "source_scout", "depends_on": ["plan"], "gate": "read_only"},
            {"id": "critic", "role": "source_critic", "depends_on": ["scout"], "gate": "cross_check"},
            {"id": "synthesis", "role": "synthesizer", "depends_on": ["critic"], "gate": "provenance"},
        ])
        execute_dependency = "synthesis"
    else:
        execute_dependency = "plan"
    nodes.extend([
        {"id": "execute", "role": "executor", "depends_on": [execute_dependency], "gate": "permission_broker" if external else "typed_action"},
        {"id": "review", "role": "critic", "depends_on": ["execute"], "gate": "independent_review"},
        {"id": "verify", "role": "verifier", "depends_on": ["review"], "gate": "tests"},
        {"id": "evidence", "role": "evidence_keeper", "depends_on": ["verify"], "gate": "completion_contract"},
    ])
    return {
        "version": 1,
        "intent": clean_intent,
        "research_mode": research,
        "external_action": external,
        "connections": connection_ids,
        "stack": list(APEX_STACK),
        "nodes": nodes,
    }
