# Monde 3B — direction artistique V3

Cette livraison améliore le moteur jouable `src/world/scene.js`. Elle ne concerne pas l’atlas décoratif de l’accueil. La sauvegarde, les récompenses, les missions, les paiements et le Passeport ne sont pas modifiés.

## Changements visibles

- Cercle Brisé physique : deux arcs fracturés en pierre et métal, chanfreins, nervures radiales, gravures et incrustations bleues. Quatre maillages, 31 216 triangles, deux supports avec collisions. L’ouverture reste libre. Le petit dispositif précédent à trois anneaux est remplacé.
- Façades du Hub : travées de fenêtres, variation minérale, verre plus sombre, stores et pièces partiellement occupées. Les éclairages intérieurs prennent progressivement le relais la nuit. Aucun maillage par fenêtre n’est ajouté.
- Neuf palettes de lumière (Hub et huit royaumes), ciel et sol différenciés, brouillard teinté de nuit. La distance du brouillard du Hub n’est plus écrasée par celle des petits royaumes.
- Aube et coucher du soleil continus, sans changement brutal à 05 h, 08 h, 18 h et 21 h.
- Oiseaux avec battement d’ailes et particules d’atmosphère, bornés selon la qualité. Les tempêtes et le réglage de mouvement réduit désactivent les éléments concernés.
- Caméra d’exploration raccourcie devant les volumes des bâtiments, monuments et transports. Le contrôle du personnage et sa position restent indépendants de cette correction.

## Rendu et ressources

L’architecture statique du Hub est regroupée par géométrie et matériau. Les anciens objets conservent leur rôle pour les états de visibilité et les niveaux de détail; des instances assurent le rendu. Le groupe observé rassemble 3 161 objets en 109 lots, avec filtrage du champ de vision. Les véhicules, les personnages et les surfaces transparentes restent séparés.

La réfraction des matériaux physiques est réservée au mode HIGH sur appareil de classe bureau. LOW et MEDIUM conservent leurs reflets d’environnement sans imposer une seconde passe de toute la scène. Les variations d’humidité ne marquent plus inutilement les matériaux à recompiler à chaque image.

Capture initiale du Hub : environ 1 187 appels de rendu. Vue corrigée : environ 244 à 250 appels. Le cadrage ayant changé avec la correction de caméra, ce n’est pas un benchmark GPU strictement comparable. Les mesures proviennent de Chromium avec rendu logiciel, pas d’un Samsung ou d’une RTX. Elles ne prouvent pas un débit de 30/60 images/s sur appareil réel.

## Vérification

Le script `scripts/verify-world-art-browser.mjs` ouvre directement le moteur réel avec une sauvegarde temporaire et bloque les services externes. Il contrôle les erreurs JavaScript et shaders, le chargement, le déplacement, le changement de région, le retour au Hub sans duplication, les modes graphiques et une cinématique interruptible. Le module de test n’est pas inclus dans l’application compilée.

```sh
node tests/world-art-direction.test.js
npm test
npm run build
PLAYWRIGHT_MODULE=/chemin/playwright/index.mjs CHROMIUM_PATH=/chemin/chromium WORLD_ART_JOURNEY=1 WORLD_ART_REGIONS=hub,france,algerie,maroc,tunisie,espagne,italie,turquie,estonie node scripts/verify-world-art-browser.mjs
```

## Export éditable

```sh
node scripts/export-world-monument.mjs /chemin/cercle-brise.glb
```

Le GLB exporté contient le monument et ses matériaux; le fichier `cercle-brise-collision.json` décrit les deux supports. L’export de contrôle mesure 3 001 212 octets. Ce n’est pas un asset Unreal déjà importé, compilé ou validé dans un niveau.

## Périmètre et limites

Cette version est une amélioration réelle de la présentation et du moteur web. Elle n’est pas présentée comme un jeu AAA terminé. Les personnages et les bâtiments existants restent en grande partie stylisés. Des assets artistiques de production, animations faciales, intérieurs complets, doublages et validations longues sur les appareils cibles restent nécessaires pour atteindre cette ambition.

Le PC Windows était hors ligne lors de cette livraison : aucune compilation Unreal ni mesure RTX 5080 n’est revendiquée. Aucun nouveau service payant, aucune génération d’image et aucune dépendance de production ne sont ajoutés. Le Passeport conserve sa Matrix bleue et ne reçoit aucun bouton.
