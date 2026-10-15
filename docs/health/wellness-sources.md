# Santé 3B — séances douces et routines

Consultation des sources : 15 octobre 2026. Adultes, bien-être général ; ce contenu n’est ni une prescription d’exercice ni un programme de rééducation.

| Source officielle | Utilisation limitée dans 3B |
| --- | --- |
| [NHS — Sitting exercises](https://www.nhs.uk/live-well/exercise/sitting-exercises/) | Chaise stable, mouvements des genoux et chevilles ; amplitude confortable et répétitions limitées. |
| [NHS — Flexibility exercises](https://www.nhs.uk/live-well/exercise/flexibility-exercises/) | Rotation douce de la tête dans les limites du confort, avec retours au centre. Aucun cercle de tête ni étirement forcé. |
| [NHS — Walking for health](https://www.nhs.uk/live-well/exercise/walking-for-health/) | Chaussures confortables, début progressif et marche adaptée aux possibilités de chacun. |
| [Manger Bouger — Réduire le temps passé assis](https://www.mangerbouger.fr/bouger-plus/a-tout-age-et-a-chaque-etape-de-la-vie/les-recommandations-pour-les-adultes/reduire-le-temps-passe-assis) | Interrompre les périodes assises par un peu de marche et des mouvements. |
| [NHS — Sleep problems](https://www.nhs.uk/every-mind-matters/mental-health-issues/sleep/) | Moment calme avant le repos, téléphone posé. Routines nommées « Au réveil » / « Avant le repos » pour inclure les horaires décalés. |
| [NHS — How to keep your teeth clean](https://www.nhs.uk/live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/) | Repère de brossage : dentifrice fluoré et environ deux minutes, notamment avant le repos. La routine n’est pas une liste exhaustive de soins dentaires. |

Les séquences de 3 et 5 minutes sont une organisation éditoriale 3B, pas des protocoles validés par ces organismes. Elles intègrent préparation et repos. L’utilisateur peut finir ses répétitions avant le terme du minuteur, passer un mouvement ou arrêter. Aucun bénéfice quantifié ni calorie n’est attribué à une séance.

## Compte du temps

- Délais calculés avec `performance.now()`, sans addition de secondes fictives.
- Préparation et repos exclus du temps d’activité.
- « Fait, continuer » conserve uniquement le temps écoulé de l’étape de mouvement ; « Passer » exclut entièrement cette étape.
- Aucun rattrapage de plusieurs étapes après une interruption. Une interruption de plus de 2,5 secondes du minuteur entraîne une pause sans créditer l’intervalle perdu.
- Page masquée ou événement `pagehide` : pause. Quitter le composant abandonne la séance non enregistrée. Aucun suivi d’arrière-plan, même si le téléphone verrouille son écran.
- Le minuteur ne vérifie pas les gestes. Le journal reçoit du temps déclaré, confirmé manuellement après la fin ; dixièmes de minute arrondis vers le bas.
- Une seule confirmation par séance. Pas de points, de séries obligatoires ou de crédit automatique.

## Intégration

`MobilitySessions({ onComplete })` appelle `onComplete({ id, minutes, completedAt })` uniquement après confirmation, une fois par séance. `completedAt` est une date ISO ; `minutes` correspond au temps chronométré des étapes de mouvement, hors étapes passées. Le parent doit enregistrer cette durée séparément des pas et éviter de l’additionner à une saisie manuelle déjà incluse dans un total d’activité.

`DailyRoutines({ date, day, onUpdate, onNavigate })` reçoit `day.routines`, tableau des identifiants connus. `onUpdate` reçoit uniquement `{ routines: [...] }` pour la date affichée. `onNavigate` reçoit `food`, `move`, `rest` ou `body`.

Identifiants persistants : `wake-water`, `wake-move`, `wake-meal`, `rest-slow`, `rest-care`, `rest-journal`. Export de `ROUTINE_IDS` et `normalizeRoutineIds` pour la validation dans le modèle parent.

Les photos réutilisent les fichiers autorisés `/health/photos/body.webp`, `rest.webp`, `walking.webp`. Ce sont des images d’ambiance, pas des démonstrations anatomiques des mouvements. Sources intégrées dans des détails repliables. Contrôles natifs accessibles au clavier, temps annoncé sans lecture vocale chaque seconde, animations désactivées via `prefers-reduced-motion`.
