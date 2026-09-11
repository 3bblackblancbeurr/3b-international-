# La Porte interdite — 3B Origins / Le Cercle Brisé

Cette proposition remplace le jeu de portes au tour par tour par une aventure d’action 3D. Elle est préparée sur `codex/forbidden-door-origins-action`, à partir de `d037572`. La mise en production attend la validation du propriétaire.

## Audit et choix

L’ancienne version sélectionnait une épreuve dans des cartes fixes : combat au tour par tour, ordre de runes, mécanisme chronométré. Elle ne possédait ni déplacement libre, ni caméra 3D, ni combat continu. Three.js, des humains riggés et leurs animations, ainsi que des textures de pierre étaient déjà présents dans l’application. Aucun fichier audio autonome n’a été trouvé dans `public`.

Le nouveau jeu réutilise `traveller-0.glb` et `traveller-1.glb`, leurs rigs et leurs clips complets. Les ennemis portent des masques, armures et capes propres au jeu ; le héros conserve une silhouette humaine. Les modèles de créatures rondes essayés pendant le travail ne sont pas utilisés. Les sources et crédits CC0 des modèles restent dans `public/world/living/CREDITS.txt`.

L’environnement monumental est construit en géométrie 3D avec surfaces texturées, arches biseautées, colonnes profilées, rochers instanciés, gravures, sols troués et une porte à deux vantaux. La couverture du catalogue est une capture du rendu du jeu. L’ambiance et les effets audio sont synthétisés avec Web Audio, avec des couches adaptées à l’exploration, au combat, au boss et à la Porte ; des pistes fournies ultérieurement peuvent être raccordées par état.

## Parcours et règles

1. **L’Approche** : retrouver le premier symbole ; une pierre mobile cache une mémoire 3B.
2. **Le Passage brisé** : franchir ou contourner les fissures, lire l’inscription, éveiller Soleil → Lune → Étoile.
3. **La Cour des Oubliés** : vaincre les ombres rapides, la sentinelle résistante et le fragment à distance.
4. **Le Cercle** : combattre le Gardien sans nom. Les trois phases introduisent frappes, projectiles et onde circulaire. Sa résistance empêche de bloquer indéfiniment ses attaques avec des coups lourds.
5. **La Porte interdite** : offrir les huit fragments, voir la Porte s’ouvrir et une silhouette inconnue apparaître brièvement.

Le parcours sert de base aux 100 niveaux : résistance et dégâts augmentent, les annonces d’attaque raccourcissent, des renforts apparaissent et plusieurs ennemis peuvent préparer leurs coups. Il s’agit de 100 variantes de difficulté du parcours, pas de 100 cartes entièrement différentes. Les talents se débloquent après les niveaux 10, 25, 50 et 75 : vitalité, dégâts, énergie et second élixir. Trois étoiles récompensent la fin du niveau, l’absence de dégâts/chute et l’absence d’élixir.

Les frappes rapides s’enchaînent en trois temps. Maintenir une frappe lourde charge une attaque plus forte. Une esquive au dernier instant et une parade réussie ouvrent une riposte. Une attaque pendant la fin d’une esquive peut devenir aérienne. Les impacts remplissent l’énergie ; Fracture Matrix coûte 75 points, frappe la zone et dissipe les projectiles proches. Le pouvoir et les attaques conservent leurs effets visuels et leur animation pendant leur durée.

## Commandes et continuité

Ordinateur : WASD / ZQSD / flèches, Maj pour courir, J ou clic pour frapper, K maintenu ou clic droit pour charger, Espace pour esquiver, F pour parer, R pour Fracture Matrix, E pour interagir, P / Échap pour mettre en pause. Le déplacement horizontal correspond à la vue de la caméra. Sur écran tactile : joystick à gauche, quatre commandes à droite, et interaction contextuelle.

Les sauvegardes gardent l’identifiant interne `tower`. Les niveaux terminés, étoiles, records et talents antérieurs sont conservés. L’ancienne partie au tour par tour ne peut pas reprendre au milieu de son épreuve : le parcours 3D commence au premier seuil du niveau sélectionné. La nouvelle partie reprend au dernier seuil sauvegardé, avec ses fragments, ressources et ennemis déjà vaincus. Les données importées sont validées ; elles ne donnent aucun XP de compte. Les récompenses 3B utilisent le système existant, seulement en jeu actif et avec une activité récente, hors menus, pause et cinématiques.

## Architecture

- `DoorPlayer.jsx` : cycle de vie React, interface, saisie, pause, sauvegarde et récompenses.
- `origins/engine.js` : simulation indépendante du rendu, pas fixe de 60 Hz, combats, états ennemis, événements et progression.
- `origins/level.js` : zones, collisions, rencontres, difficultés et validation des reprises.
- `origins/motion.js` : déplacement, angles, anticipation et interpolation de caméra.
- `origins/scene.js`, `environment.js`, `actor.js`, `effects.js` : rendu Three.js chargé à l’ouverture du jeu, animations avec transitions, instanciation, effets réutilisés et qualité adaptative.
- `origins/audio.js` : voix audio bornées, motifs et effets par situation, suspension et fermeture du contexte.

La résolution est plafonnée par un budget de pixels et peut diminuer progressivement en mode Automatique. Économie réduit résolution, particules et ombres. Ultra ajoute le bloom. Les préférences de mouvement réduit suppriment secousses et effets intenses. La fermeture annule la boucle, débranche l’observation de taille, libère les ressources et détruit le contexte WebGL. Une perte de contexte ou une ressource manquante donne accès à une relance.

## Vérifications

- Build Vite complet réussi. L’avertissement de taille concerne les bundles partagés React / Three.js déjà volumineux ; le nouveau moteur de scène est chargé séparément à la demande.
- Suite complète : **320 tests réussis**. Parmi eux, 17 tests Origins, dont un parcours des 100 niveaux utilisant les vrais contrôles de simulation, sans attribuer artificiellement vie, dégâts ou progression.
- Parcours dans Edge par commandes clavier : cinq zones, cache, runes, combat, trois phases du boss, Porte, victoire, niveau suivant, fermeture et reprise après rechargement.
- Mobile émulé 390 × 844 et paysage 844 × 390 : deux contacts tactiles simultanés, charge et relâchement, annulation, esquive, arrêt du déplacement, pause, redimensionnement et retour.
- Ressource manquante, perte du contexte WebGL, relance, qualité Ultra, mouvement réduit, mort réelle causée par un ennemi, reprise, confinement du focus et restitution du focus.
- Arène et labyrinthe toujours jouables ; quatre cartes conservées et URL de La course des clés inchangée.
- Aucune exception JavaScript dans les parcours réussis. Les fermetures répétées ramènent le compteur de géométries à zéro, ferment les contextes audio et détruisent les contextes WebGL. Three.js garde une unité dans son compteur interne de textures après destruction ; aucun contexte actif ne subsiste et ce compteur n’augmente pas au fil des relances.
- Mesures indicatives du navigateur de test : environ 60 images/s sur ordinateur au début du parcours ; 52–60 images/s pendant les manipulations mobiles émulées. Les performances d’un téléphone physique ne sont pas attestées par ces mesures ; le mode Automatique est la valeur par défaut.

Les scripts reproductibles sont `scripts/verify-origins-play.mjs`, `scripts/verify-origins-mobile.mjs` et `scripts/verify-origins-resilience.mjs`. Ils utilisent Playwright et un navigateur Chromium. Définir `ORIGINS_BASE_URL` pour une prévisualisation, `ORIGINS_BROWSER_CHANNEL=msedge` pour Edge et, si Playwright est fourni hors du projet, `ORIGINS_PLAYWRIGHT_MODULE` avec son URL de module. Les captures et rapports sont écrits dans `artifacts/origins/`. Les tests interceptent les sauvegardes réseau dans des contextes isolés et ne modifient pas le compte du propriétaire.
