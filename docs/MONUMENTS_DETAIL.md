# Monuments : reprise du 12 septembre 2026

Cette livraison affine les huit monuments existants. Elle ne constitue ni une collection de tous les monuments célèbres, ni une reproduction patrimoniale exacte ou photoréaliste.

## Tour Eiffel

Le modèle du jeu conserve une hauteur de 60 unités pour rester compatible avec le quartier et ses collisions. Les niveaux suivent les repères 57, 115 et 276 sur une hauteur de référence de 330 mètres, publiés par [la Tour Eiffel](https://www.toureiffel.paris/fr/le-monument/chiffres-cle). Le deuxième niveau reçoit une plateforme supérieure.

La charpente comprend des cornières, des plaques d'assemblage et rivets, des croisillons sous les plateformes, des parapets, des guides d'ascenseurs, des cabines statiques, des escaliers dans un pilier et des éléments d'antenne. Les détails sont une interprétation de jeu, pas un relevé d'ingénierie. Les étages ne sont pas des intérieurs accessibles.

Le modèle détaillé contient 66 204 triangles, le modèle léger 15 264. Chacun utilise trois maillages et trois matériaux. Les GLB sont exportés directement depuis la géométrie Three.js avec glTF Transform puis compressés avec Meshopt : aucun travail Blender n'est revendiqué pour cette livraison.

Reproduction : `node scripts/build-eiffel-glb.mjs`, puis `node scripts/compress-eiffel.mjs`.

## Autres pays

| Pays | Monument existant | Changements |
| --- | --- | --- |
| Italie | Colisée | Attique, fenêtres, pilastres, joints des voussoirs, douze rangées de gradins avec contremarches |
| Tunisie | El Jem | Joints des voussoirs et gradins ; secteur ouvert conservé |
| Estonie | Cathédrale Alexandre-Nevski | Chaînages, fenêtres latérales et encadrements |
| Turquie | Tour de Galata | Joints verticaux, balustres et nervures de couverture |
| Algérie | Mémorial du Martyr | Joints, cercles de soubassement, matière sans carreaux de maçonnerie |
| Maroc | Mosquée Hassan II | Toit à faîtage assis sur le bâtiment, motifs et bandeaux du minaret |
| Espagne | Sagrada Família | Meneaux, traverses et détails des portails |

Les textures de pierre sont projetées en unités du monument pour éviter leur étirement sur les grands volumes. Les matériaux sont regroupés pour garder les huit silhouettes sous le budget existant de 12 appels de rendu et 100 000 triangles par monument.

## Vérification et limites

Les tests contrôlent les bornes, les valeurs finies, les budgets de géométrie, la libération des ressources et les accès à la Tour Eiffel. Les captures du navigateur couvrent les huit pays, avec chargement des deux variantes Eiffel. Un navigateur de bureau ne mesure pas les performances sur un Samsung réel.

La composition des monuments reste simplifiée : façades, sculptures, intérieurs et proportions locales nécessitent encore une production artistique individualisée. La Sagrada Família en particulier n'est pas une restitution de son état architectural complet. La version précédente du jeu possède encore son ancien modèle Eiffel ; cette refonte Eiffel concerne le monde Origins.

Les changements sont locaux et ne sont pas publiés par cette livraison.
