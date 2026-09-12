# Monde 3B — graphismes et contrôle mobile, 12 septembre 2026

Version locale, branche `codex/3b-origins-justice`. Aucune publication effectuée pour cette mission.

## Diagnostic et périmètre
React 19.2.6, Vite 7.3.6 et Three.js 0.186.0 confirmés dans les dépendances installées. Aucun changement de moteur. La page par défaut utilise désormais `origins/scene.js`, distinct de l’ancien `scene.js`. Le contrôle porte principalement sur Origins, France et Sanctuaire. Les huit pays de la version précédente sont conservés ; les réglages communs de terrain et de végétation leur sont appliqués. Leurs villes ne sont pas toutes reconstruites par cette livraison.

Avant : scène de référence à plus de 1,5 million de triangles, tour inaccessible, charpente et plateformes trop pleines, végétation sommaire, joystick avec seuil supplémentaire, direction recalculée pendant un geste caméra et rapprochement automatique près des murs.

## Modifications effectivement intégrées
- Mouvement : réutilisation de `advanceMotion`, collisions par sous-pas, amplitude analogique, un seul seuil radial, repère de marche conservé tant que le geste reste tenu. Capture perdue, annulation, pause et perte de focus arrêtent les commandes. Fréquence des instantanés React ramenée à 5 Hz. Animations jambes/actions existantes conservées et cadence liée à la distance parcourue.
- Caméra : suivi temporel, distance choisie conservée près des bâtiments, occultation des façades au lieu du rapprochement. Inclinaison permettant de regarder le sommet de la tour.
- Eiffel : arches courbes, plateformes ajourées, quatre pieds, croisillons et métal peint mat ; deux exports GLB réellement produits dans Blender 4.5.9 puis compressés Meshopt. Proportions de référence 330/125/57/115/276, hauteur de jeu 60 unités avec facteur uniforme. Parvis accessible, route et point de navigation ajoutés, collisions des pieds.
- Sol : mélange procédural partagé mieux réglé, relief plus discret, pavés à échelle cohérente en coordonnées du monde, raccords aux intersections et bandes de gravier. Couvert végétal déterministe excluant rues, pièces et bâtiments, petits cailloux ancrés, arbres réutilisant le système régional existant. Les familles de matériaux des autres biomes sont préservées ; elles ne font pas chacune l’objet d’une nouvelle production PBR complète.
- Éclairage : chaîne sRGB/ACES conservée sans ajout de bloom ni flou ; matériaux de pierre, verre et fer distincts, ombres détaillées réservées aux bâtiments proches. Le profil léger conserve une carte d’ombres 1024, le détaillé 2048.
- Optimisation : bâtiments proches détaillés, distants allégés, végétation instanciée par secteurs avec élimination à distance. Résolution pilotée par le contrôleur existant, avec temporisations. Meshopt conservé. KTX2 non ajouté : aucun chargeur/pipeline existant détecté, bénéfice non mesuré et absence de justification pour une nouvelle chaîne dans cette passe.

## Mesures reproductibles
Edge headless 153.0.4234.32 sur ordinateur Windows, contexte isolé neuf par essai, serveur Vite local. Même position (-55,-60), caméra et sauvegarde synthétique. Échantillon statique de 8 secondes, après 1,2 seconde d’attente. Le temps « ouverture » mesure navigation jusqu’au bouton reprendre ; ce n’est pas un téléchargement à froid garanti (cache disque/OS possible). Les ressources sont le nombre d’entrées Resource Timing, pas une mesure mémoire. Les durées sont les intervalles requestAnimationFrame, pas le temps GPU ni un profil CPU détaillé.

| Profil | Triangles avant → après | Appels avant → après | Résolution interne avant → après | Ouverture avant → après |
|---|---:|---:|---|---|
| desktop / auto | 1,538,972 → 613,780 | 155 → 178 | [1440, 900] → [1440, 900] | 2276 → 3051 ms |
| mobile / light | 1,576,556 → 388,111 | 160 → 158 | [468, 1012] → [390, 844] | 982 → 1257 ms |

Les deux profils donnent environ 16,66 ms de moyenne et 16,8 ms au 95e percentile sur cet échantillon court. Cela ne démontre ni stabilité longue durée ni vitesse sur téléphone. Le nombre de ressources desktop augmente de 30 à 35 (deux niveaux de bâtiments), mobile de 30 à 31. La baisse des triangles ne signifie pas une baisse de tous les coûts : davantage de lots sont dessinés sur ordinateur. Mémoire GPU, chauffe et batterie non mesurées.

## Vérifications
- `npm` absent du PATH : les scripts équivalents ont été exécutés avec le binaire Node installé, sans prétendre que les commandes npm littérales fonctionnent.
- `node --test tests/*.test.js` : premier passage 342/343, budget de secteurs végétaux dépassé. Cause corrigée ; passage complet suivant via verify : **343/343**, aucun test désactivé.
- `node node_modules/vite/bin/vite.js build` : réussi. Avertissement existant sur certains bundles supérieurs à 500 kB.
- `node scripts/verify-world.mjs` : réussi, exécute tous les tests puis le build.
- Tests ajoutés : analogique/diagonale à 30/60/90/120 Hz, absence de double seuil, stabilité du repère, arrivée/collisions et accès au monument.
- `scripts/verify-mobile-mission.mjs` : contrôle réel dans Edge local, gestes CDP simultanés gauche/droite, action, capture perdue, pause/reprise, portrait/paysage, vues de la tour et trajet par la carte. Résultats exacts dans `interaction-checks.json`.
- Captures du jeu exécuté, sans image de remplacement : avant/après desktop/mobile, ensemble/approche/sous les arches, portrait/paysage et atelier.

## Ressources et provenance
Source d’origine vérifiée : `../3b-unreal/ArtSource/Paris/ParisReference.blend`. Nouvelle source réellement enregistrée : `../3b-unreal/ArtSource/Paris/EiffelReference.blend`.
Pipeline : `export-eiffel-geometry.mjs`, `build-eiffel-reference.py`, `compress-eiffel.mjs`, `paris-asset-manifest.mjs`. `public/world/paris/Eiffel.glb`, `Eiffel-lod.glb` et empreintes du manifeste actualisés. Géométrie originale, aucune photogrammétrie ni modèle tiers importé.
Références officielles de proportions et de structure, consultées sans importer leurs photographies comme textures : [chiffres clés](https://www.toureiffel.paris/fr/le-monument/chiffres-cle), [premier étage](https://www.toureiffel.paris/fr/decouvrir/1-er-etage), [sommet](https://www.toureiffel.paris/fr/decouvrir/sommet), [fondations](https://www.toureiffel.paris/fr/actualites/histoire-et-culture/les-sous-sols-et-fondations-de-la-tour-eiffel). Les photographies restent celles de leurs ayants droit. Textures Paris existantes : provenance/licences dans `public/world/paris/textures/sources.json` (Poly Haven CC0). Aucune nouvelle texture tierce téléchargée.

## Fichiers principaux
`src/world/origins/{scene,environment,nature,data,space}.js`, `OriginsPage.jsx` ; `src/world/{motion,camera-follow,eiffel-tower,natural-ground,vegetation,landscape,surfaces,paris-district}.js` ; `tests/mobile-mission.test.js` ; scripts et ressources Eiffel ci-dessus. Les modifications antérieures du créateur et des autres fonctionnalités ont été conservées.

## Limites et contrôle Samsung
**Contrôle tactile en émulation ; performances sur Samsung physique non vérifiées.**
Le rendu reste stylisé. Horizon simplifié, bords de chemins réguliers et transitions de matières perfectibles ; cailloux issus d’une forme de base variée, pas encore plusieurs sculptures. Les détails de la tour ne constituent pas une reproduction patrimoniale exacte. Les nouvelles densités géométriques sont choisies au chargement de la zone ; le contrôleur adaptatif ajuste la résolution en cours de jeu. Pas de revendication « grand studio » ni de refonte complète des huit villes.
Parcours Samsung reproductible, environ dix minutes : choisir Fluide, apparaître en France, marcher sur place/pavés/herbe, rejoindre le parvis via la carte, tourner sous les arches, revenir à l’Atelier, entrer/sortir, déplacer et regarder simultanément avec les deux pouces, utiliser une action, relâcher hors zone, passer paysage puis portrait, mettre en arrière-plan puis reprendre. Observer chaleur, à-coups, commandes bloquées, caméra et sauvegarde ; relever modèle exact, navigateur et qualité. Refaire en Auto seulement si Fluide est stable.
