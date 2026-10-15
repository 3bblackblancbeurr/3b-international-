# 3B Religion — compléments documentaires et exploration

Lot additif fondé sur le commit 934e5f26ecb846448909c913a256513a7d2ac6a1.

## Préservation

Le menu Religion est déjà déverrouillé dans cette version. Ce lot ne modifie ni le corpus de 179 figures / 196 liens, ni le moteur Three.js, ni les images, les biographies ou les contenus existants. Il ajoute une couche documentaire autour de l'arbre et de la bibliothèque. Le module d'entrée importe toujours le moteur initial ; un échec de chargement des compléments laisse l'arbre initial disponible.

## Ajouts

Quatre dossiers éditoriaux sourcés ; dix accès explicitement typés vers textes, récitations, films et catalogues des éditeurs ; quatre parcours guidés ne prétendant pas représenter une chaîne de filiation ; exploration de l'ascendance et de la descendance du corpus avec inclusion explicite des successions textuelles ; lecture vocale française par passages, pause et vitesse ; export JSON de la fiche et de ses sources ; styles adaptatifs et accès clavier.

Aucune reproduction intégrale non autorisée, aucun lecteur tiers chargé automatiquement. La synthèse vocale est présentée comme lecture éditoriale, pas comme récitation sacrée. Ce lot n'est ni une encyclopédie exhaustive ni une généalogie historique de toute l'humanité. Les liens inconnus ne sont pas inventés. Les catalogues ne sont pas décrits comme des films individuels.

## Vérification locale effectuée

- Node : 17 tests réussis, 0 échec. Un test supplémentaire exigeant le vrai corpus du dépôt est ignoré dans le banc local isolé ; il doit s'exécuter dans le dépôt.
- Chromium hors réseau : 19 contrôles réussis, aucune erreur JavaScript ; affichages 390 et 1440 pixels, dialogues, navigation, filtres, non-duplication, export et conservation des fiches du banc d'essai.
- Ces contrôles de composants utilisent un DOM et des données de test. Ils ne prouvent pas le fonctionnement du vrai rendu WebGL, du son sur un téléphone physique ou de la production.

## Contrôles d'intégration à exécuter dans le dépôt

`node --test tests/religion-discovery.test.js`

`npm run build`

Puis tester `/religion/index.html#home` et `/religion-tree.html` : trois traditions, anciens contenus, arbre, recherche, sélection d'Adam et Ève, parcours, sources, dialogues, export, lecture réelle, plein écran et navigation de retour. Vérifier les contenus statiques `/religion/discovery-plus.js`, `discovery-core.js`, `discovery-data.js` et `discovery-plus.css` sur le déploiement.

Le package.json du projet ne change pas. La mise en production ne doit pas être annoncée sur la seule base des tests locaux.
