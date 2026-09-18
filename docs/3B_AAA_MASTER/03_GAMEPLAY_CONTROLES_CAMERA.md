# 3B AAA MASTER — Gameplay, contrôles et caméra

## Statut

Lot **World Motion V2** implémenté sur une branche dédiée, y compris dans la scène active **3B ORIGINS**.

## Décisions appliquées

- Joystick flottant dynamique à gauche : zone morte de 10 px, réponse progressive, pleine course à 72 px.
- Tap gauche : pathfinding existant. Double tap : sprint de trajet limité.
- Zone droite réservée à la caméra ; un tap droit ne lance plus de trajet.
- Double tap droit : reprise immédiate du suivi automatique.
- Accélération et décélération exponentielles indépendantes du FPS.
- Reprise du suivi caméra après 0,55 seconde au lieu de 1,4 seconde.

## Critères d’acceptation

- Aucun mouvement involontaire pendant une rotation caméra.
- Arrêt court et naturel sans glissement prolongé.
- Tap-to-move annulable par le contrôle manuel.
- Collisions, pathfinding et vitesse indépendants du FPS.
- Build et tests dédiés verts.

## Suite P0

1. Test tactile sur Samsung réel en paysage.
2. Ajustement des constantes à partir des FPS et d’une vidéo réelle.
3. Évitement caméra des murs par raycast.
4. Profils caméra intérieur / exploration / combat.
5. Orientation paysage uniquement dans le Monde du 3B.
