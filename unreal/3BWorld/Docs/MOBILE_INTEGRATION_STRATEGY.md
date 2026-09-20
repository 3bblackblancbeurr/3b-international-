# Stratégie mobile 3B World

## Phase 1 — preuve Unreal

Construire Unreal comme application de test autonome.

Objectif :
- valider rendu ;
- World Partition ;
- contrôles tactiles ;
- backend ;
- Passeport ;
- Ville 3B ;
- performance.

Ne pas commencer par intégrer Unreal dans le shell React/Capacitor : cela ajouterait un chantier natif avant même d'avoir validé le monde.

## Phase 2 — choix produit

Après vertical slice, comparer :

### Option A — Monde Unreal autonome relié au même compte
Plus simple techniquement pour la production du jeu.

### Option B — intégration native dans l'application 3B
Expérience plus unifiée, mais intégration iOS/Android plus lourde.

### Option C — lancement/handoff depuis l'application
Compromis : l'app garde le Passeport/boutique/communauté et lance le Monde avec handoff sécurisé.

Le choix ne doit être fait qu'après :
- build Android réel ;
- build iOS réel ;
- poids installé ;
- temps de démarrage ;
- RAM ;
- qualité graphique ;
- fluidité.

## Web

La version web Three.js reste utile comme accès léger tant que la stratégie Unreal web n'est pas justifiée par des mesures.
