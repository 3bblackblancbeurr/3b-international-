# Monde 3B — enquête France sur place · 18 octobre 2026

## Ce que change ce lot

Les témoignages et preuves de France occupaient des marqueurs répétés, parfois au
même point, et leurs conversations suspendaient le monde. L'enquête possède
maintenant sept lieux dans une même province : établi de Léa, témoin du quai,
médiation, archives, atelier de reliure, comparaison des traces et deux plateaux.
Le joueur doit rejoindre chaque lieu. Les distances, collisions et chemins sont
contrôlés avec le moteur de navigation existant.

Une interaction locale ouvre une lecture et ses choix au-dessus du monde qui
continue de tourner. En s'éloignant, la lecture se ferme. Les preuves ne sont
obtenues qu'après une commande acceptée ; ouvrir le texte ne donne rien. Les
mauvaises accusations ne débloquent ni étape ni restauration. Le clavier revient
au jeu à la fermeture.

Les établis, registres, étagères, coutures et plateaux restent dans le décor. Les
archives ouvertes, noms rétablis et dossier résolu reflètent les effets enregistrés
par la campagne ; une phase, une animation ou un survol ne peuvent les attribuer.
Les gestes utilisent les animations existantes, avec un bref mouvement de feuille
qui respecte la réduction des animations. Il ne s'agit pas d'animations de mains
ou de visages produites sur mesure.

## Coût de la nouvelle mise en scène

Le mobilier des sept lieux partage ses matériaux et ses lots de géométrie :
9 objets de rendu dans le navigateur, 8 772 sommets. Les lieux éloignés sont
masqués ; les indices de géométrie ne sont réécrits que lorsque la visibilité ou
un état accepté change. Aucun éclairage supplémentaire, téléchargement d'asset
externe, minuterie ni boucle d'animation séparée. Ces mesures concernent le
module ajouté ; elles ne représentent pas le coût de toute la scène.

## Compatibilité et publication

Les objectifs, récompenses et schéma de sauvegarde existants sont conservés.
Les nouvelles commandes indiquent `layoutVersion: 2` et leurs positions sont
vérifiées sur les nouveaux lieux. Les anciennes commandes sans version peuvent
encore rejouer aux emplacements exacts de l'ancien parcours, y compris un relais
déjà commencé. Le moteur conserve son idempotence et refuse une version inconnue.

**Ordre impératif : déployer le paquet canonique `world-engine` avant le frontend.**
Le nouveau serveur comprend les deux générations de positions. L'ancien serveur
ne comprend pas les nouvelles. Le générateur `prepare-world-engine.mjs` et les
sources candidates embarquent le nouveau module ; les tests vérifient leur parité.
Une PR publiée ne constitue pas une mise à jour de ce serveur ni du site public.

L'entrée du monde conserve une seule frontière de chargement asynchrone, au lieu
de deux requêtes successives. Le monde et Three.js restent hors du téléchargement
initial. Les octets totaux restent comparables et l'avertissement de taille du
module Vite est conservé ; aucun gain de FPS sur téléphone n'est annoncé.

## Validation locale

- Suite complète stable : 2 663 tests réussis, zéro échec, un ignoré.
- Tests ciblés : navigation des sept lieux, progression complète de France,
  Céliane et retour au Hub, mauvaises décisions, duplication, rechargement,
  journaux anciens et nouvelles commandes, collisions, ressources et lot graphique.
- Compilation de production et garde-fou Gold Master réussis.
- Audit de chargement : une seule frontière asynchrone, monde/Three.js différés,
  aucun cycle statique entre les fichiers JavaScript de production.
- 16 captures WebGL du module isolé, ordinateur et tactile, avant et après
  restitution. Enseigne des archives et motif des trois points bleus revus sur
  les captures. Ce décor de test isolé est clairement légendé dans les images.
- Parcours de la vraie interface réussi en Edge sur Windows, ordinateur et
  affichage tactile 844 × 390 avec animations réduites : six interactions par
  les vrais boutons, ouverture au clavier, mauvaise accusation, monde qui continue
  de tourner, fermeture en s'éloignant, mise en page et reprise du journal après
  rechargement. Les positions sont arrangées par la fixture privée ; ce contrôle
  ne mesure pas une séance complète de marche de 15–20 minutes ni les FPS du S21.
  Rendu ANGLE D3D11 demandé localement ; CI conserve son rendu logiciel.
  Script reproductible : `scripts/verify-france-investigation-browser.mjs`,
  ajouté à la matrice CI. Rapport : `outputs/france-investigation/report.json`.

Le contrôle Hub de la branche précédente avait échoué sur une attente du guidage
ordinateur ; l'artefact montrait ensuite ce guidage en cours, sans erreur de page.
Le scénario privé attend maintenant le vrai calcul du worker avec rendu suspendu,
puis vérifie le guidage et son annulation dans l'interface. Aucun contrôle produit
n'est retiré.

## Critères encore ouverts

Ce lot constitue une progression jouable et visuelle de France. Le jeu entier
reste stylisé. La tranche France de 15–20 minutes approuvée artistiquement, les
personnages et créatures propres, le Monstre de l'Oubli, les cinématiques finales,
la finition de chacun des sept autres royaumes, la coopération serveur complète
et la production Unreal restent des lots distincts. Les essais de durée,
chauffe et fluidité sur Samsung S21/Xiaomi physiques ne sont pas remplacés par
un affichage tactile de navigateur.

La référence de sortie reste `PROFESSIONAL_FINISH_GATES_20261017.md`.
