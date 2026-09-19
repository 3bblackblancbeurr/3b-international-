# Monde du 3B — Weapon Handling V2

## Objectif
Une arme physique ne doit plus sembler collée à l'avant-bras. Le système distingue désormais **prise**, **rangement**, **sortie**, **posture armée** et **combat**.

## Règle globale
- Hors combat : arme rangée (ceinture/dos) ou matérialisée uniquement quand nécessaire.
- Rencontre/combat : arme sortie et tenue dans la main prévue.
- Marche/course arme sortie : jambes en locomotion, haut du corps en pose **Ready** pour éviter que le bras balance à travers l'arme.
- Attaque : l'animation d'action prend temporairement la priorité.
- Fin de combat : retour au rangement après la fenêtre d'action.

## 16 armes
| ID | Arme | Prise | Rangement | Règle visuelle |
|---|---|---|---|---|
| heritage | Épée du voyageur | 1 main droite | hanche | poignée centrée dans la paume |
| paris | La Flèche de Paris | 2 mains | dos | hampe diagonale, main principale basse |
| romano | L'Arco Romano | arc / 2 mains | dos | arc main gauche, main droite libre pour corde |
| tallinn | Tallinn Zero | 1 main droite | hanche | lame courte éloignée de l'avant-bras |
| bosphore | Lame du Bosphore | double | dos | prise principale main droite, pose double |
| alger | Lumière d'Alger | 1 main droite | hanche | **jamais montée sur l'avant-bras** |
| carthage | Héritage de Carthage | 2 mains | dos | trident/lance tenu par la hampe |
| zellige | Zellige | main gauche | dos | bouclier hors du bras droit |
| abanico | Abanico Rojo | 1 main droite | hanche | éventail devant la paume |
| scissors | Ciseaux dissociés | double | dos | lames séparées sans traverser le poignet |
| axe | Hache des bâtisseurs | 2 mains | dos | manche dans la paume, tête hors du corps |
| saber | Sabre des passages | 1 main droite | hanche | garde juste devant la main |
| bow | Arc des horizons | arc / 2 mains | dos | arc main gauche |
| claws | Griffes du loup | matérialisé | caché | seulement les griffes peuvent suivre les mains |
| wings | Ailes de résonance | corps/dos | caché | aucune attache à l'avant-bras |
| thread | Fil fantôme | 1 main | caché | émission depuis la main, pas du coude |

## Machine d'état
`HOLSTERED -> DRAWING -> READY -> ACTION -> READY -> SHEATHING -> HOLSTERED`

### Priorités
1. Death/Hit
2. Attack/Cast/Guard
3. Ready (arme sortie)
4. locomotion normale (arme rangée)

## Contrôles visuels obligatoires
- La poignée doit rester dans la paume pendant Idle/Walk/Run/Attack.
- Aucun modèle physique ne doit traverser le radius/ulna du bras.
- Les armes longues ne doivent pas traverser le torse pendant la course.
- Les armes de dos ne doivent pas couper la tête ou les jambes.
- La main secondaire des armes 2 mains doit être traitée par pose dédiée; IK complet pourra raffiner le contact ensuite.
- Sur mobile, vérifier face/profil/dos et pendant un virage.

## Critères d'acceptation
- 16/16 profils définis.
- Lumière d'Alger = arme tenue, pas gantelet d'avant-bras.
- Bouclier = main gauche.
- Arc = main gauche + pose 2 mains.
- Lance/trident/hache = pose 2 mains.
- En combat et en mouvement, le haut du corps ne repasse pas sur une animation de marche qui balance les bras.
- Hors combat, les armes physiques reviennent à leur rangement.
