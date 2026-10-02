# France — vertical slice et Chaos QA

Date de recette : 2 octobre 2026.

Ce document sépare les faits exécutés dans l'application web des ambitions artistiques ou fonctionnelles qui restent à produire. Un test automatisé ne constitue pas une preuve d'asset final AAA.

## Parcours demandé

| Étape | État vérifié | Preuve locale |
|---|---|---|
| BOOT | PASS | `blankSave()` crée un état versionné et borné. |
| SAVE | PASS | Le parcours est normalisé, sérialisé et restauré après chaque commande du test Chaos. |
| HUB | PASS | Le joueur part du Hub et le moteur interdit le changement direct de pays hors Nexus. |
| FRANCE | PASS | La visite débloque le chapitre France et ses données canoniques. |
| KAÏS | PASS | L'avatar Kaïs est normalisé, enregistré puis restauré. |
| LIFE | PASS fonctionnel | Aide de l'habitant, équipe, foyer et activités de quartier existent ; leur profondeur reste inférieure à un jeu AAA final. |
| MISSION | PASS | Pouvoirs, puzzle, trois Souvenirs et deux premiers niveaux de restauration sont exécutés. |
| COMBAT | PASS | Défaite, sortie, nouvelle tentative et victoire Gardien sont testées. |
| CRÉATURE | PASS | Un Écho réel de France est approché, apaisé, recruté puis sauvegardé. |
| TOURNOI | BLOQUÉ FONCTIONNEL | Aucun système de tournoi canonique n'existe dans le moteur Monde 3B actuel. Il n'est ni simulé ni présenté comme terminé. |
| FRAGMENT | PASS | Trois Souvenirs, le sceau France et le compteur du Hub sont persistants et non dupliqués. |
| REWARD | PASS | XP, Éclats, victoires, cartes et sceau sont accordés par les commandes du moteur et bornés à la restauration. |
| SAVE | PASS | Les totaux et possessions survivent à un aller-retour JSON + normalisation. |
| HUB évolué | PASS | Le Hub atteint `evolutionStage = 1`, rend la plateforme France restaurée et fait revenir Céliane. |
| RESTART | PASS | La reprise conserve exactement récompenses, collection, sceau, chapitre et avatar. |

## Chaos couvert automatiquement

- checkpoint et reprise après chaque commande du chemin principal ;
- double collecte d'un Souvenir sans double XP ni double Éclat ;
- double acquittement d'une cinématique sans effet économique ;
- seconde restauration sans seconde récompense ;
- défaite Gardien sans sceau, puis nouvelle tentative valide ;
- revanche après victoire limitée à la petite récompense prévue, sans duplication du sceau ;
- valeurs locales malformées bornées, identifiants inconnus et doublons rejetés au redémarrage.

Commande de validation ciblée :

```powershell
node --test tests/france-vertical-slice-chaos.test.js tests/france-goldmaster-loop.test.js tests/france-celiane-slice.test.js
```

## Limites honnêtes

- Le jalon TOURNOI doit être conçu et implémenté avant que la chaîne demandée soit complète.
- La recette prouve le moteur web, pas une production Unreal Gold Master ni des assets finaux AAA.
- Les tests visuels multi-GPU, le mix audio final, les performances sur appareils réels et la direction artistique finale demandent encore une validation humaine et matérielle.
