# LOIS CANONIQUES — CITÉ DES HUIT HÉRITAGES V3

## Statut

Ce document est une règle de production. Il fixe ce qui ne doit plus être réinterprété pour le Hub du Monde du 3B.

La référence visuelle est la **Carte futuriste de la Cité des Huit Héritages** validée par le fondateur. Dans l’application, sa traduction exploitable est `/world/hub/cite-huit-heritages-canon-v3.svg` et le plan data-driven `src/world/hub/data/hub-master-plan-v2.json` (contenu V3).

## Loi 1 — Le Hub est une métropole, jamais un petit cercle

Le Hub n’est pas une place avec huit boutons autour d’un anneau. C’est une métropole ouverte d’environ **1,8 km × 1,4 km**, composée de quartiers, axes, eau, ponts, niveaux verticaux, transports, bâtiments, habitants et huit approches de Portes dispersées.

Toute vue qui réduit la Cité à « 8 Portes autour d’un cercle » est un fallback obsolète.

## Loi 2 — Le Hub est l’unique grande zone sûre

Dans la Cité :
- aucun monstre hostile libre ;
- aucun dégât environnemental arbitraire ;
- aucune mort de joueur liée à l’exploration normale ;
- aucun PvP sauvage ;
- les combats sont contenus dans l’Arène 3B ou une activité explicitement consentie.

La Cité doit donner le sentiment de rentrer chez soi entre deux expéditions.

## Loi 3 — Dix quartiers, dix fonctions

1. **Place de l’Héritage** — arrivée, orientation, événements, premières missions.
2. **Tour du Cercle Brisé** — histoire, fragments, carte, progression.
3. **Archives de la Mémoire** — souvenirs, énigmes, lore, Cartes Vivantes.
4. **Arène 3B** — entraînement, défis, mobilité, combat encadré.
5. **Quartier Commerce** — boutique, craft, garage, équipements, contrats.
6. **Quartier Communauté** — groupes, coopération, expositions, événements.
7. **Quartier Innovation et IA** — IA Textile, Mode 3 IA, avatar, prototypes.
8. **Docks et Transports** — train, bateaux, fret, sauvetage, routes.
9. **Portail Ville 3B** — construction de ville personnelle, visites, trophées.
10. **Jardins de l’Unité** — nature, mémoire, animaux, contemplation, secrets.

Un grand bâtiment sans usage réel n’est pas considéré terminé.

## Loi 4 — Les huit Portes sont dispersées et territoriales

Les huit Portes sont des destinations de la ville, pas des boutons flottants.

- France — Justice — Céliane
- Algérie — Loyauté — Yliane
- Espagne — Passion — Diego
- Maroc — Noblesse — Naël
- Italie — Espoir — Alessio
- Tunisie — Courage — Soraya
- Turquie — Foi — Émir
- Estonie — Sagesse — Eira

Chaque approche doit annoncer visuellement son héritage avant même le franchissement de la Porte.

## Loi 5 — Le Cercle Brisé reste le cœur, pas toute la ville

La Tour du Cercle Brisé et la Place de l’Héritage forment le cœur narratif. Elles ne doivent pas absorber les dix quartiers ni les huit Portes.

Le Cercle a été créé pour maintenir huit héritages en relation sans les mélanger ni les effacer.

## Loi 6 — Kaïs est Porteur du Lien

Kaïs n’est pas un neuvième Gardien et ne porte pas une neuvième valeur.

Son anneau est le connecteur arraché au Cercle lors de la Rupture. Les huit fragments sont complets ; le Lien manquant est ce qui permet aux huit de répondre ensemble.

## Loi 7 — L’Oubli n’est pas un peuple ni un pays

L’Oubli grandit lorsque mémoire, transmission et valeurs sont séparées. Le Monstre de l’Oubli en est une manifestation, pas l’explication politique ou ethnique d’un ennemi unique.

Le récit doit toujours protéger cette nuance.

## Loi 8 — La boucle du jeu transforme la Cité

Boucle principale :

**Cité → Porte → royaume → habitant / mission → trois souvenirs → épreuve de valeur → Gardien → fragment / sceau → retour Cité → transformation visible.**

Le retour au Hub n’est jamais un simple écran de chargement : il doit montrer ce qui a changé.

## Loi 9 — Huit stades d’évolution visibles

- 0 — Cité blessée
- 1 — Premier lien
- 2 — Deux voix
- 3 — Mémoire partagée
- 4 — Cité en mouvement
- 5 — Héritages reliés
- 6 — Résonance
- 7 — Avant l’Union
- 8 — Cercle retrouvé

Les Portes, lumières, transports, habitants, passerelles et cœur du Cercle doivent progressivement refléter ces étapes.

## Loi 10 — La ville doit être dense mais lisible

Aucun grand vide décoratif. Chaque grand axe conduit à :
- un service ;
- une activité ;
- une mission ;
- un secret ;
- une récompense ;
- une Porte ;
- ou un point visuel fort.

La densité ne doit jamais sacrifier la lecture mobile.

## Loi 11 — La verticalité est réelle

Maximum de référence : trois niveaux importants.
- niveau bas : docks, eau, tunnels, quais ;
- niveau principal : rues, places, commerces, parcs ;
- niveau haut : passerelles, terrasses, tours, téléphériques, tyroliennes.

Les raccourcis doivent avoir une fonction de navigation et non seulement décorative.

## Loi 12 — La mobilité évite les longues marches forcées

Le joueur peut marcher, mais les grandes distances disposent d’alternatives :
- 3B Express circulaire ;
- bateaux-taxis ;
- téléphériques ;
- tyroliennes ;
- véhicules sur grands axes ;
- voyage rapide depuis les services autorisés.

## Loi 13 — Les habitants ont une vie

Les PNJ importants peuvent conserver des souvenirs persistants : aide, dette, promesse, rencontre, réputation, trahison ou événement marquant.

Leur routine varie selon heure, météo, histoire et événements. Les souvenirs influencent dialogues, confiance, services ou quêtes quand le système le prévoit.

## Loi 14 — Autorité et sauvegarde

La logique de récompense ne doit jamais être accordée uniquement par l’interface.
- Supabase / moteur autoritaire valide les états sensibles ;
- les données narratives n’accordent pas directement XP, fragments ou inventaire ;
- le client peut prédire le mouvement, jamais inventer la progression.

## Loi 15 — Mobile d’abord, richesse adaptative

Budgets de référence :
- Android moyen : 30 fps, 3 cellules actives ;
- mobile haut de gamme : 60 fps, 4 cellules ;
- PC : jusqu’à 6 cellules ;
- cellules de 120–160 m.

LOD, instancing, streaming, réduction des NPC lointains, ombres et effets adaptatifs sont obligatoires avant d’augmenter la densité.

## Loi 16 — Rien n’est « fini » sans preuve

Une fonctionnalité est terminée uniquement si :
1. elle existe dans le code ;
2. elle fonctionne dans le build ;
3. les tests automatiques sont verts ;
4. son comportement réel est vérifié ;
5. le rendu téléphone ne casse pas l’interface ou les performances.

## Boucle finale de l’histoire

Après les huit Gardiens et huit fragments, Kaïs découvre que les fragments n’étaient pas incomplets : le Cercle avait perdu son connecteur. Les huit Gardiens reprennent leur place, Kaïs relie leurs ancrages avec l’anneau et la Cité devient le lieu où les héritages peuvent à nouveau se transmettre sans s’effacer.

Le Cercle restauré conserve les traces de ses cassures : la victoire ne rend pas le monde parfait, elle lui rend la capacité de se souvenir, transmettre et continuer.
