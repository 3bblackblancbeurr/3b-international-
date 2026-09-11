# Monde 3B — villes habitées et aventure continue

Mise à jour web du 11 septembre 2026. Le Monde 3B est un monde à habiter : explorer, aménager ses lieux, préparer ses sorties, protéger les environs et entraîner personnages et créatures. Les histoires des huit pays et le défi de l’Oubli sont des jalons facultatifs, pas un écran de fin.

## Changements livrés

- Échelle commune : portes de 4,8 unités, étages de 5,6 unités, maisons larges de 11 à 12 unités ; le personnage garde sa taille. Deux à trois étages en ville, un étage dans les maisons de campagne.
- Quartiers avec rues arrondies, croisements, places, vitrines, stores, volets, corniches, balcons, lanternes et habitants marchant sur les voies. Les détails varient : toits mansardés en France, tuiles et enduits italiens, pignons estoniens, volumes ottomans, terrasses algéroises, bleu tunisien, enduits de Marrakech et balcons andalous. Ce sont des adaptations compactes, pas des reconstitutions géographiques.
- Nombre de bâtiments régionaux, hors refuge personnalisable : France 27, Italie 26, Estonie 26, Turquie 27, Algérie 28, Tunisie 24, Maroc 25, Espagne 26.
- La mini-carte utilise les mêmes rues courbes et empreintes de bâtiments que le monde. Le placement, la collision et les déplacements partagent la même échelle.
- Fin du rapprochement automatique de la caméra derrière une maison. La distance choisie reste constante dans une région et lors des voyages. Une ouverture progressive dans les façades masquantes préserve la visibilité. Les cadrages temporaires des rencontres et cinématiques reviennent à la vue choisie.
- Chaque pays dispose de trois ressources et d’un refuge avec trois aménagements visibles : habitation, atelier, jardin. Les rangs sont bornés à huit pour conserver l’équilibre ; les expéditions restent renouvelables.
- Une expédition coûte une provision. Une victoire renouvelle les gisements, offre 35 XP monde, 8 éclats et 30 points d’expérience à chaque membre du groupe. Un repli garde bâtiments et expérience. Aucune dégradation hors connexion. Une ration de secours au refuge permet de repartir si le stock est vide.
- La maîtrise des personnages et créatures progresse avec leur expérience d’expédition. L’effet sur la puissance du groupe est plafonné pour ne pas effacer les choix tactiques. Les bonus du refuge concernent l’aventure, pas les duels Internet.
- Combat : commandes tactiles et raccourcis J (frappe), K (garde), Espace (esquive), L (pouvoir). L’esquive dépense une concentration, évite les dégâts et prépare une unique frappe de contre-attaque à +45 %. L’interface indique les intentions adverses. Les règles restent des échanges tactiques ; ce n’est pas encore un système complet de combat libre en temps réel.
- Les sauvegardes historiques, identifiants des êtres et récompenses des histoires sont conservés. Le champ historique `finished` indique seulement le défi de l’Union déjà accompli. Il ne bloque aucune expédition.

## Direction artistique fondée sur les sources 3B

Sources accessibles dans Codex : « Réécriture du tome zéro », « Amélioration manga Cays », « Dimensions carte Pokémon », le catalogue de 368 fiches et les illustrations déjà intégrées. La vidéo jointe `1000013432.mp4` a été consultée par extraction locale de cinq images de référence, dont la ville vue depuis une chambre et le portrait de Kaïs. Ces images de travail ne sont pas publiées comme décors.

Les éléments définis par l’auteur guident la direction : BLACK • BLANC • BEUR, huit pays, huit portes et clés, Cercle Brisé, loup, Oubli, noir et blanc, bleu et or 3B. Le Cercle Brisé apparaît sur certaines façades et au refuge ; il ne remplace pas le logo officiel. Le joueur reste un personnage personnalisable, conformément aux choix plus récents de l’auteur.

La bibliothèque privée ChatGPT Images n’était pas connectée dans le navigateur. Cette livraison ne prétend donc pas avoir inspecté toutes les images du compte. Les personnages des fiches restent la source ; les objets « cartes » ne constituent pas le concept du jeu.

## Choix techniques et références

Le rendu conserve Three.js, les modèles animés existants, le tone mapping AgX, l’éclairage d’environnement, les ombres douces et la qualité adaptative. Les bâtiments sont regroupés par matériau pour limiter les appels graphiques. La transparence d’occlusion utilise une découpe progressive sans déplacer la caméra ni trier chaque façade. Aucun moteur ni service payant ajouté.

Références techniques : [matériaux Three.js](https://threejs.org/docs/pages/Material.html), [déploiement des fonctions Supabase](https://supabase.com/docs/guides/functions/deploy). Le code local de Three.js 0.186.0 a servi à vérifier les points d’insertion des shaders.

Références de conception, adaptées sans copier leur univers : [Sucker Punch — construction du monde de Tsushima](https://blog.playstation.com/2020/07/09/crafting-the-world-of-tsushima/) pour relier environnement et direction artistique ; [Sucker Punch — combat et riposte](https://blog.playstation.com/2020/06/23/ghost-of-tsushima-mastering-the-katana/) pour la lisibilité des intentions et réponses ; [Nintendo — Breath of the Wild](https://www.nintendo.com/au/games/nintendo-switch/the-legend-of-zelda-breath-of-the-wild) pour l’exploration et l’expérimentation. Les noms et mécaniques propres à 3B restent prioritaires.

## Validation et limites

Tests : règles, sauvegardes, coûts, récompenses uniques, cycles d’expédition dans les huit pays, esquive et contre-attaque, échelle des bâtiments, accès aux objectifs avant/après construction du refuge. Essais navigateur : récolte réelle dans le décor, jardin visible, combat clavier/tactile, progression après rechargement, rues et caméra dans chaque pays. Essai de compte séparé : mêmes résultats entre navigateur et serveur, restauration sur un autre appareil simulé, rejet de ressources insuffisantes et déduplication des commandes.

Les mesures graphiques concernent le PC de travail avec Edge. Le format téléphone est une émulation de fenêtre, pas un test sur un téléphone physique. Les modèles restent stylisés ; leur adaptation individuelle à toutes les illustrations, la construction libre parcelle par parcelle, les intérieurs visitables, le combat libre en temps réel et un monde coopératif persistant demandent un chantier complémentaire. Le mode actuel d’arène Internet reste disponible. Cette livraison concerne l’application web, pas une nouvelle compilation Unreal.
