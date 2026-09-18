# Problèmes connus — 3B International

## P0 — validation réelle mobile

- Le nouveau contrôle Motion V2 a passé les tests automatisés, mais doit encore être essayé sur un Samsung réel en mode paysage.
- Le verrouillage d'orientation dépend du support navigateur. Un écran explicatif prend le relais en portrait.
- Les constantes du joystick, du sprint et de la caméra devront être ajustées à partir d'une vidéo et de mesures FPS réelles.

## P1 — caméra

- L'évitement des murs par raycast/sphere cast n'est pas encore implémenté dans la scène active Origins.
- Il manque des profils distincts exploration, intérieur, combat, boss et dialogue.
- Le soft-lock combat et le changement de cible restent à finaliser.

## P1 — performance

- Le build signale encore des chunks JavaScript supérieurs à 500 kB.
- L'avatar, Three.js et certains écrans secondaires doivent être chargés plus tardivement.
- L'audit production (`npm audit --omit=dev`) remonte **0 vulnérabilité**.
- Les trois alertes modérées concernent uniquement les dépendances de développement : `@capacitor/cli@8.5.2` → `xcode@3.0.1` → `uuid@7.0.3`.
- npm propose un retour de `@capacitor/cli` vers `8.4.3`, ce qui désalignerait la pile Capacitor 8.5.2. Aucun downgrade ou override risqué n'est donc appliqué sans validation du build Android/iOS.

## P1 — Supabase

- Activer la détection des mots de passe compromis dans Supabase Auth.
- Maintenir l'audit des fonctions `app_install_ping`, `app_presence_ping` et `world_party_command`.
- Tester l'isolation des données avec deux comptes réels.

## P2 — France Gold Master

- Corriger l'échelle perçue de la ville par cellules et streaming.
- Ajouter le vertical slice de 10 à 20 minutes : arrivée, rue vivante, PNJ, intérieur, énigme, combat, récompense, sauvegarde et retour Ville 3B.
- Mettre en place les budgets assets, LOD, KTX2, instancing et culling avant d'augmenter fortement la densité.

## P2 — Ville 3B

- Remplacer progressivement les champs numériques de placement par une vraie manipulation visuelle sur grille.
- Ajouter annuler/rétablir, aperçu de collision, routes et visite complète.
- Ajouter le parcours E2E connexion → création → placement → sauvegarde → reconnexion → visite.

## Non considéré comme terminé

- La PR 72 possède une preview Vercel réussie et tous les contrôles automatisés sont verts.
- Elle reste volontairement en brouillon et n'est pas fusionnée dans `main` tant que le test physique Samsung en paysage n'a pas validé les commandes.
