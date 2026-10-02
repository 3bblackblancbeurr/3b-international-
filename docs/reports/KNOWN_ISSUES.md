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
- Le vertical slice fonctionnel couvre maintenant arrivée, Kaïs, aide de l'habitant, pouvoirs, énigme, Souvenirs, créature, épreuve de Justice, combat de Céliane, récompense, sauvegarde/reprise et retour au Hub évolué. La recette automatisée et ses limites sont consignées dans `FRANCE-VERTICAL-SLICE-CHAOS-QA.md`.
- Concevoir puis implémenter le TOURNOI canonique : ce jalon demandé n'existe pas encore dans le moteur Monde 3B et n'est pas présenté comme terminé.
- Transformer ce parcours fonctionnel en séquence jouable de 10 à 20 minutes avec intérieurs, mise en scène, rythme, audio et assets finaux réellement validés.
- Mettre en place les budgets assets, LOD, KTX2, instancing et culling avant d'augmenter fortement la densité.

## P2 — Ville 3B

- Remplacer progressivement les champs numériques de placement par une vraie manipulation visuelle sur grille.
- Ajouter annuler/rétablir, aperçu de collision, routes et visite complète.
- Ajouter le parcours E2E connexion → création → placement → sauvegarde → reconnexion → visite.

## Non considéré comme terminé

- Les tests automatisés et le rendu web local ne prouvent pas un Gold Master Unreal/AAA.
- Le statut d'une ancienne preview ou PR ne remplace jamais une recette du commit courant.
- Une validation physique Samsung en paysage reste nécessaire pour les commandes et les performances réelles.
