# Monde du 3B — Passe « scène d'abord » Master V07 (17 octobre 2026)

## Direction artistique à respecter

- Référence : Cité des Huit Héritages monumentale, Cercle Brisé habité, ciel maritime profond, champagne/or chaud, bleu Matrix utilisé en accent et non partout.
- **Le joueur regarde le monde, pas des boîtes.** Les panneaux ne doivent pas boucher les vues ni les boutons de déplacement.
- Le Hub et chacun des huit royaumes conservent leur canon, leurs coordonnées, objectifs, portails, personnages, comptes et sauvegardes.
- Les images conceptuelles sont des cibles artistiques, pas une preuve de rendu natif AAA.

## Tranche de code de cette PR

- Caméra initiale du personnage rapprochée avec vue légèrement surélevée ; **zoom déjà sauvegardé non écrasé**.
- HUD du Hub : panneaux éditoriaux plus légers, carte compacte, objectifs essentiels lisibles en paysage, Détails ouvrables, réduction du bruit décoratif pendant la marche.
- HUD des huit royaumes : accents de pays, cadrage éditorial, meilleure présentation des épreuves et des interactions.
- Effets limités au CSS; aucune scène, texture, lampe, shader, boucle d'animation, dépendance ni effet Three.js ajouté.
- Aucun droit d'accès, récompense, mission ou persistance modifié.
- Tous les contrôles accessibles restent disponibles : Journal, Carte, Guidage, Arrêter, Pause, Affichage, Réglages et actions de proximité.

## Vérifications avant fusion

- Suite complète Node et build Vite.
- Scènes Chromium/Edge : 1280x800, 844x390 et 740x320, aucune exception, absence de défilement horizontal, objectifs et carte non superposés.
- Le volet Détails fonctionne au toucher et n'occupe pas le paysage lorsqu'il est fermé.
- Conserver la possibilité de masquer complètement les widgets et de les réactiver.
- Vérifier sur Samsung S21 en paysage (30 minutes, voyages, course, combat, bouton de diagnostic).
- Vérifier Xiaomi (nettété, alignement des éléments, chauffe) : le GPU logiciel Chromium ne remplace **jamais** le téléphone.
- Obtenir la preview du SHA final; ne pas confondre branche GitHub, compilation et mise en ligne publique.

## Reste à réaliser pour la qualité AAA

1. **P0** Fluidité réelle : gels S21, Xiaomi flou, ressources GPU et mémoire pendant des voyages répétés.
2. **P1** Une mission France de 10 à 20 minutes avec intérieur fonctionnel, conséquences visibles et combat de Céliane.
3. **P1** Assets à hauteur de Kaïs : visage, vêtement, armes, Gardien, animations faciales, lieux uniques, lumières et bruitages.
4. **P2** PNJ avec routines, métiers et mémoire; variété des huit campagnes; événements indépendants du menu.
5. **P2** Coopération dans le même terrain avec synchronisation, autorité du serveur et reconnect.
6. **P3** Unreal : assets binaires, France World Partition/HLOD, captures PIE, compilations Client/Server et build Windows.

## Critère de qualité

Une passe est « terminée » quand **une image du jeu réel et un scénario joué** montrent sa valeur sur PC et téléphone. Des tests verts sans rendu validé ne font pas un Gold Master.
