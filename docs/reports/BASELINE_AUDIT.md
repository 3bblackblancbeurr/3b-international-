# Baseline audit — Monde du 3B

- Base : main au commit 486d0e4a18f1944539c05b30b69848963be78626.
- Branche : chatgpt-improvements-world-motion-v2.
- L’ancienne branche chatgpt-improvements reste intacte car elle a divergé de main.

## Défauts P0 vérifiés

- La zone gauche combinait joystick invisible et tap-to-move.
- Un tap dans la zone caméra pouvait lancer pointRoute.
- Pas de contrôleur d’accélération/décélération du joueur.
- Reprise caméra après 1,4 seconde.

## Fondations déjà présentes

- Pathfinding A* via navigation.js.
- Collisions et mouvement par pas courts via advanceMotion.
- Profils auto / fluid / detail.
- Tests de mouvement à 15, 30, 60 et 120 FPS.
