# 3B AAA MASTER — PLAN D’IMPLÉMENTATION MONDE VIVANT V1

## Objet

Transformer la Bible du Monde Vivant et le catalogue de bâtiments en une première tranche jouable mesurable, sans construire prématurément les huit pays complets.

## Lot A — Fondations de données

- catalogue canonique des huit portes, Gardiens et valeurs ;
- dix secteurs fonctionnels du hub ;
- réseau train, bateaux, téléphériques, tyroliennes et véhicules ;
- profils de population par niveau graphique ;
- 20 archétypes d’ambiance ;
- 8 PNJ fonctionnels ;
- 6 PNJ narratifs ;
- 2 PNJ secrets ;
- 12 missions ;
- 6 micro-événements ;
- tests d’intégrité des données.

**Statut : préparé dans `src/world/living-world/` et `tests/living-world-catalog.test.js`.**

## Lot B — Blockout du hub

Construire en géométrie simple :

1. Place de l’Héritage ;
2. Tour du Cercle Brisé ;
3. Archives ;
4. Docks ;
5. Gare 3B Express ;
6. Portail Ville 3B ;
7. Porte France ;
8. Porte Algérie.

### Critères

- échelle humaine cohérente ;
- distances testées avec Motion V2 ;
- aucun trajet à pied inutilement long ;
- train et bateau réduisent réellement les temps de parcours ;
- 30 FPS minimum sur Android moyen visé ;
- cellules chargées progressivement.

## Lot C — Simulation PNJ V0

- pooling ;
- machine d’états légère ;
- points d’intérêt ;
- planning matin/journée/soirée/nuit ;
- réaction à la pluie et aux événements ;
- activation par distance ;
- foule simplifiée à longue distance.

## Lot D — Transports V0

- un trajet complet du 3B Express ;
- un bateau-taxi Docks ↔ Ville 3B ;
- une tyrolienne Archives → Place ;
- un téléphérique Place → Innovation ;
- annulation et récupération en cas d’erreur ;
- sauvegarde des lignes débloquées.

## Lot E — Contenu V0

Implémenter d’abord :

- `Huit chemins, un héritage` ;
- `Le premier Écho` ;
- `La ligne interrompue` ;
- `Un signal sur l’eau` ;
- le secret du dernier train ;
- le secret du quai dans le brouillard.

## Lot F — Test E2E

Connexion → Passeport → Monde du 3B → Place → PNJ → train → Archives → mission → Docks → bateau → récompense → sauvegarde → reconnexion → état restauré.

## Interdictions de production

- ne pas modéliser cinquante bâtiments détaillés avant validation du blockout ;
- ne pas simuler tous les PNJ hors cellule ;
- ne pas charger les assets des huit pays dans le hub initial ;
- ne pas fusionner sans build, tests et preview ;
- ne pas appeler « terminé » un système uniquement documenté.

## Prochaine tâche technique rentable

Créer le blockout du réseau Place de l’Héritage ↔ Tour ↔ Archives ↔ Docks, puis mesurer le temps de trajet à pied, en train et en bateau avec Motion V2.
