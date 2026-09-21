# 3B Penalty Rush — canon produit et gameplay

## Position dans Les Jeux 3B

**3B Penalty Rush** est le premier jeu présenté dans Les Jeux 3B et il est **100 % multijoueur**. Il n'existe pas de campagne solo contre une IA. La carrière est la conséquence des duels joués contre de vraies personnes.

Boucle principale :

`placement → changement de rythme → lecture → feinte → décision → frappe / arrêt`.

Une partie cible environ **3 à 5 minutes**.

## Match

- Joueur A attaque, Joueur B garde le but.
- L'attaquant part du milieu du terrain.
- Une possession dure au maximum **15 secondes**.
- Chaque joueur possède **3 attaques** dans sa période.
- À la mi-temps, les rôles sont inversés.
- En cas d'égalité après les deux périodes : **Duel d'Or**.
- Le Duel d'Or donne une attaque à chacun et recommence tant que les résultats de la paire sont identiques.

Le serveur Supabase est l'autorité du chrono, du score, des rôles, des frappes, des arrêts, du résultat et du classement.

## Contrôles : deux zones, pas une rangée de boutons

### Pouce gauche

Joystick discret apparaissant sous le doigt :

- direction ;
- déplacement ;
- dosage du rythme ;
- ralentissement naturel quand le joueur relâche.

### Pouce droit — attaquant

Gestes contextuels :

- petit glissement : feinte ;
- glissement rapide : crochet / grand changement de direction ;
- double impulsion courte : accélération ;
- maintien + glissement + relâchement : frappe ;
- trajectoire courbe du doigt : effet ;
- maintien court avec mouvement vers le haut : Panenka.

La frappe est un geste unique. La longueur, la direction, la durée du maintien et la courbe du mouvement déterminent puissance, zone visée et effet.

### Pouce droit — gardien

- glissement horizontal : plongeon ;
- glissement vers le haut : sortie haute ;
- glissement vers l'avant : fermeture de l'angle.

Le gardien ne possède pas une rangée de boutons d'arrêt.

## Poids du ballon

Le ballon n'est pas collé au pied.

- vitesse élevée → touche plus longue ;
- contrôle technique élevé → touche plus proche ;
- ralentissement → contrôle plus propre ;
- accélérer constamment consomme de l'énergie.

La distance visuelle ballon/joueur doit permettre à l'adversaire de lire le risque sans rendre l'action automatique.

## Énergie et Flow

### Énergie

Les feintes, crochets, accélérations et frappes ont un coût. Le but est d'empêcher le spam et de rendre le changement de rythme intentionnel.

### Flow

Le Flow récompense la variation et la qualité de l'enchaînement.

- actions variées réussies : hausse ;
- même action répétée : faible gain ou baisse ;
- échec : baisse ;
- Flow élevé : sensation plus fluide, jamais victoire automatique.

## Pouvoirs gardien

Deux pouvoirs maximum sont équipés avant le match. Ils utilisent **une jauge commune**.

- **Impulsion** : perturbe brièvement le contrôle / la trajectoire. Coût élevé.
- **Lecture** : donne une zone probable, jamais la cible exacte.
- **Mur fantôme** : améliore temporairement la couverture d'une portion du but ; mobilité réduite.
- **Ancrage** : augmente la portée ; déplacement latéral ralenti.

Aucun pouvoir ne garantit un arrêt.

## Styles de joueur

Cinq orientations équilibrées :

- Technicien ;
- Explosif ;
- Finisseur ;
- Imprévisible ;
- Maestro.

Chaque style déplace légèrement le compromis contrôle / burst / frappe / Flow. Aucun profil n'a un budget de puissance global supérieur.

## Interface en match

Le terrain doit rester presque vide.

Éléments permanents seulement :

- joueurs ;
- score ;
- période ;
- compte à rebours ;
- énergie ;
- Flow ;
- deux minuscules icônes des pouvoirs équipés quand le joueur est gardien ;
- zones tactiles très discrètes.

Tout le reste appartient aux menus hors match.

## Identité joueur

Un joueur possède une identité permanente liée à son compte 3B :

- prénom ou pseudo ;
- nom de maillot ;
- numéro 1–99 ;
- pays de carrière ;
- style ;
- célébration ;
- club ;
- historique.

Le pays peut être choisi avant la carrière. Il est verrouillé après le premier duel officiel afin que le classement national et les sélections restent cohérents.

## Vestiaire

Personnalisation cosmétique :

- couleur principale et secondaire du maillot ;
- motif ;
- short ;
- chaussettes ;
- silhouette de chaussures ;
- couleur chaussure / semelle / lacets ;
- célébration.

**Règle non négociable : aucun cosmétique acheté ou débloqué n'augmente vitesse, précision, puissance, portée ou énergie.**

## Clubs

Le gameplay reste 1v1. Un club agrège des duels réels.

Un club possède :

- nom ;
- code ;
- couleurs ;
- propriétaire ;
- capitaines / membres ;
- réputation et historique à construire.

Format cible d'une rencontre club : cinq duels 1v1 dont les résultats composent le score collectif.

## Carrière

Deux notions sont séparées :

- **Elo** : niveau compétitif du moment ;
- **Réputation** : histoire construite sur la durée.

Paliers de réputation :

1. Inconnu
2. Prospect
3. Révélation
4. Confirmé
5. Star
6. International
7. Icône

Le profil conserve les matchs, victoires, buts, arrêts, Duels d'Or et événements de carrière.

## International

Pays initiaux :

- France — Justice
- Algérie — Loyauté
- Maroc — Noblesse
- Tunisie — Courage
- Turquie — Foi
- Italie — Espoir
- Espagne — Passion
- Estonie — Sagesse

La sélection ne doit pas être un simple copier-coller du classement Elo.

Le radar national prend en compte :

- nombre minimum de matchs ;
- rang national ;
- réputation ;
- forme ;
- performance dans les situations de pression ;
- besoin de profil.

États :

`non classé → radar → observé → présélection → sélection`.

Message signature :

> **Le pays a besoin de toi.**

Une convocation est un événement de carrière. Elle ne peut pas être achetée.

Compétitions 3B :

- 3B Nations ;
- 3B Continental Series ;
- International Crown ;
- Crown of Nations.

## Architecture technique

### Client

- React/Vite dans l'application 3B ;
- écran Penalty Rush chargé depuis Les Jeux 3B ;
- rendu et gestes tactiles ;
- aucune décision de score ou de classement faisant autorité.

### Serveur

Edge Function `penalty-rush` :

- Auth 3B obligatoire ;
- matchmaking rapide / classé ;
- salons privés ;
- état du duel avec révision CAS ;
- chrono de possession ;
- validation des gestes ;
- résolution de frappe ;
- pouvoirs ;
- settlement de résultat ;
- profil / club / carrière / radar national.

### Base

Tables `penalty_*` dédiées et RLS activée. Les clients ne mutent jamais directement les données compétitives.

## Principes anti-triche

- JWT obligatoire ;
- profil serveur normalisé ;
- valeurs de geste clampées ;
- rôle contrôlé côté serveur ;
- score et résultat calculés côté serveur ;
- révision de room atomique ;
- settlement idempotent ;
- Elo modifié seulement par le settlement serveur ;
- cosmétique séparé des règles compétitives.

## Priorité de finition

1. fiabilité réseau 1v1 ;
2. sensation du ballon / du changement de rythme ;
3. lisibilité des gestes ;
4. plaisir attaquant **et** gardien ;
5. mobile portrait et paysage ;
6. matchmaking et reprise de session ;
7. carrière ;
8. clubs ;
9. international ;
10. contenu saisonnier.

La profondeur hors terrain ne doit jamais rendre le match plus compliqué à contrôler.
