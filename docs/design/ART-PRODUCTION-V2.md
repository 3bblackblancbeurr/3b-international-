# 3B — Décors et visuels HD, livraison V2.1

## Ce qui est réellement livré

- Une illustration terminée de la Cité Origine : 1 672 × 941 pixels, Cercle Brisé, terrasses, cascades, jardins et habitants. Elle apparaît sur l’accueil et sert de panorama du Monde. Aucun HUD ou logo officiel n’a été généré.
- Les sources haute définition de la collection existante : noir 1 229 × 1 536 pixels, blanc 1 122 × 1 402 pixels. Elles remplacent les petites vignettes de 280 × 350 pixels dans le showroom. Le détail et les motifs sont des cadrages des mêmes sources, sans inventer de couture.
- Un atlas 3D interactif avec huit architectures distinctes, jardins, ponts, arcades, fenêtres éclairées, eau animée, quatre cascades et 48 silhouettes en mouvement. La caméra voyage vers le pays choisi.
- Un kit architectural éditable exportable en GLB : 72 objets fusionnés par matériau et quartier, 54 920 triangles. Le fichier exporté contient les géométries et matériaux de base; les habitants, l’eau animée et les textures chargées à l’exécution restent dans le moteur de présentation.

## Fidélité et nature des fichiers

Les visuels de boutique sont des rendus de présentation déjà présents dans les fichiers du propriétaire. Ils ne sont pas des photographies nouvelles prises sur des vêtements fabriqués. Le modèle noir et le blanc gardent leurs monogrammes d’origine; aucun nouveau logo n’est substitué. Les images sont encodées en WebP à leur définition native, sans agrandissement artificiel. Le prix et le catalogue serveur ne sont pas modifiés.

Le décor illustré est un visuel artistique. L’atlas est une maquette 3D de présentation, distincte du monde jouable sauvegardé. Il ne faut pas le présenter comme la production AAA définitive du jeu : les assets de jeu finaux, leurs collisions, niveaux de détail, animations complètes et validations dans Unreal/Samsung ne sont pas produits par une illustration. Aucune capture réelle des vêtements ne peut être fabriquée à partir des rendus actuels.

## Livraison économe

Une seule génération d’image supplémentaire a été utilisée, via l’outil intégré ImageGen, en partant de « Le Nexus, Cité Origine.png ». Les visuels produit ont été retrouvés et réutilisés. Aucune dépendance de production ni service payant externe n’a été ajouté. Les trois images WebP totalisent environ 1,07 Mo.

Le panorama est affiché par défaut. L’atlas se charge au choix explicite d’un pays ou du bouton dédié, uniquement sur les appareils compatibles et à proximité de l’écran. Il est arrêté hors écran et en arrière-plan, et détruit au retour au panorama. Limite : 30 images/s et pixel ratio ≤ 1,4. Les textures PBR réutilisent les surfaces CC0 déjà présentes, décrites dans `public/world/paris/textures/sources.json`.

## Reproduire le modèle 3D

```sh
npm ci
node scripts/export-luxury-architecture.mjs /chemin/cite-origine.glb
```

Le GLB ne contient ni identité de membre, ni sauvegarde, ni service réseau. La géométrie est générée par `src/design-system/universe-architecture.js` et ses limites sont vérifiées par `tests/luxury-art.test.js`.

## Prompt du décor

Édition à partir de la Cité Origine existante : conserver le Cercle Brisé monumental, les terrasses habitées, ponts, cascades et jardins; supprimer toutes les interfaces, mini-cartes, textes et logos; remonter légèrement la caméra, ouvrir l’escalier central, garder les personnages petits; pierre détaillée, métal champagne, reflets d’eau et énergie bleue contrôlée. Un seul décor large, cohérent, sans montage ni cadre de téléphone. La demande de 3 840 × 2 160 a été interprétée par l’outil; la sortie réelle mesurée est 1 672 × 941, qui est la définition annoncée et livrée.

Les dimensions, provenances et empreintes des médias sont consignées dans `public/art/luxury-v2/manifest.json`.
