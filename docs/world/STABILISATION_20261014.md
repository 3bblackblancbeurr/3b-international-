# Monde 3B — candidat de stabilisation, 14 octobre 2026

Objectif : supprimer les gels observés pendant la course et fixer une référence
visuelle avant de terminer le Hub, puis la France. Ce candidat ne constitue pas
un jeu AAA terminé et ne prouve pas encore l'absence de gels sur Samsung.

## Recherche et défauts établis dans le code

- La préparation progressive du terrain existe déjà. `setQuality` annulait le
  travail actif même lorsque le profil demandé était identique : corrigé.
- La reconstruction vérifiait le numéro de LOD, sans vérifier sa densité réelle.
  Après un changement de profil, un secteur pouvait conserver une géométrie trop
  dense : corrigé, avec remplacement progressif de la surface complète.
- La qualité automatique pouvait restaurer résolution/effets pendant le
  déplacement. La récupération attend maintenant des fenêtres stables sans
  mouvement. La réduction du travail reste autorisée pendant la course.
- Les FPS moyens ne décrivent pas les gels. Un relevé local borné ajoute le
  nombre d'intervalles >=250 ms pendant les déplacements, le pire intervalle,
  le percentile 95 des 240 dernières images et les pics de simulation/rendu.
  Les pauses, chargements initiaux et onglets cachés ne sont pas échantillonnés.
  Le relevé n'envoie aucune télémétrie et ne stocke aucune identité.

Ces défauts sont établis par lecture et tests. Leur contribution exacte aux gels
de 2–3 secondes signalés par le propriétaire reste à mesurer sur son téléphone.

Sources primaires consultées :
- https://threejs.org/docs/pages/WebGLRenderer.html — compilation anticipée,
  redimensionnement ; ne pas ajouter une compilation sans cause identifiée.
- https://threejs.org/manual/pages/responsive.html — coût de la résolution mobile.
- https://developer.chrome.com/docs/web-platform/long-animation-frames —
  différence entre fréquence moyenne et longues images.

## Collaboration Claude

Trois revues ont été obtenues auprès de Claude dans la session connectée :
contrôleur mobile, seconde lecture des garde-fous, méthode de référence artistique.
Claude a travaillé sur les extraits et résultats transmis ; il n'a pas inspecté
indépendamment le dépôt ni testé le téléphone. Voir `REVUE_CLAUDE_MOBILE_20261014.md`.

## Références reproductibles

`scripts/verify-world-stability-browser.mjs` utilise le vrai moteur, une partie
invitée isolée, un viewport mobile 844×390, DPR 1 et le 14/10 à 16:20.

- Hub : Cercle Brisé et tour civique, caméra [110,130,150] vers [0,75,0].
- France : village `village-2-3`, caméra relative [+90,+72,+100], cible à +6 m.
- Qualité adaptative, palettes et matériaux existants conservés.
- Capture réelle PNG, test de déplacement avec sprint, contrôle des erreurs et
  absence de modification des récompenses. Aucune API de test n'est publiée.

Les images sont disponibles dans `stability-reference/` et peuvent être
reproduites par le workflow **World stability reference** après envoi de la branche.
Un rendu logiciel de CI ne mesure pas les performances du téléphone réel.

## Validation locale

Build de production : réussi. Tests ciblés : 42/42 réussis.
Suite complète exécutée avec `node --test --test-force-exit tests/*.test.js` :
2 395 réussis, aucun échec, un ignoré. Le nouveau test de rotation sur 28 dates
a ensuite été exécuté dans les 42 tests ciblés.
Le téléchargement Playwright initial était tronqué. Un navigateur Chromium
obtenu via le paquet npm @sparticuz/chromium a permis le rendu local réel.
France : capture et sprint réussis sans erreur de script/shader.
Hub : capture reproductible et sprint réussis sans erreur de script/shader.
Les deux scènes et leur nettoyage ont été exécutés séparément avec le script
final. Ces tests confirment le fonctionnement du rendu, pas les FPS du Samsung.
La suite complète a signalé un défaut préexistant de guidage après `first_steps` :
Inès Varga pouvait manquer du catalogue de PNJ. Corrigé : le prochain donneur
de mission débloquée reçoit une priorité de présence, sans augmenter la limite
de 18 PNJ sur mobile. Le parcours complet et 28 dates de rotation sont testés.

## Passage sur le Samsung — porte de validation

1. Utiliser la version candidate, qualité adaptative, puis tester le mode fluide
   séparément. Ne pas comparer deux versions avec des réglages différents.
2. Dans le Hub : courir 5 minutes, tourner la caméra, traverser les mêmes zones,
   refaire le parcours. En France : courir autour du village et traverser des
   frontières de secteurs, puis revenir.
3. Continuer 20 minutes ; relever le nombre de ralentissements et le délai
   maximal dans Réglages → État du rendu. Inclure modèle du téléphone, navigateur,
   qualité choisie et état froid/chaud dans le compte rendu.
4. Viser 30 images/s stables et aucun gel de 2–3 secondes sur les parcours répétés.
   Un échec exige une trace de performance, pas l'ajout d'effets graphiques.
5. Comparer les vues jour/nuit et à hauteur du personnage : proportions,
   circulation, façades, végétation, lisibilité, eau, caméra et Cercle Brisé.

## Suite du jeu complet, dans l'ordre

| Lot | Livrable et critère de sortie | État |
|---|---|---|
| Stabilisation | Parcours Samsung sans les gels signalés ; mesures conservées | Candidat, validation réelle à faire |
| Référence artistique | Hub et village approuvés à hauteur du joueur, jour/nuit | Quatre vues fixes livrées, direction artistique et téléphone à valider |
| Hub | Portails, intérieurs, habitants, transports, missions et récompenses accessibles | Inventaire existant à revalider, guidage vers la mission suivante corrigé |
| France | Kaïs : arrivée → missions → combat → récompense → sauvegarde → retour Hub | Tests de campagne existants, acceptance bout en bout à refaire |
| Plateforme | Passeport unique, commandes, menus, compagnon et installation cohérents | Audit séparé à mener sans régression |
| Sept royaumes | Déployer les systèmes éprouvés en France avec identité propre | Après validation Hub/France |
| Finition | Audio, cinématiques, accessibilité, appareils et séances longues | Porte finale de publication |

Ne fusionner ni qualifier cette passe de « zéro bug » tant que les résultats de
rendu et les vérifications du téléphone ne sont pas disponibles.

## Examen visuel des captures

Les captures sont du moteur réel. Le Hub présente encore une architecture
procédurale et le village France reste trop simple et trop vide pour l'ambition
AAA. Ces images constituent des références de départ, pas une approbation
artistique. Aucune régression visuelle globale n'est prétendue résolue ici.

## Livraison

Branche locale `codex/world-stability-reference-20261014`. L'envoi initial a été refusé faute d'autorisation explicite. Le propriétaire
a ensuite autorisé explicitement l'envoi et la poursuite du travail le
14 octobre 2026. Première version publiée dans la PR #532 ; ses sept workflows ont réussi.
Seconde passe préparée après trois revues Claude, nouveaux contrôles à suivre.
La validation Samsung reste à effectuer avant de qualifier le candidat de stable.

## Seconde passe mobile et références à hauteur du joueur

Le contrôleur vise maintenant 30 images/s sur les appareils à pointeur tactile.
Ce seuil est une cible de décision de qualité, pas un plafonnement du rendu.
Un 30 FPS constant garde sa résolution. Une surcharge doit persister trois
fenêtres avant une baisse ; les gels isolés sont enregistrés séparément.
Les paliers de résolution sont absolus, sans multiplication supplémentaire au
passage fluide. La reprise attend une période sans déplacement et un délai
30–120 secondes ; les transitions de profil lourd sont espacées de 60 secondes.
La période de stabilisation après changement attend le terrain jusqu'à 8 secondes,
mais ne masque pas les gels dans le diagnostic après le chargement initial.

Le relevé téléchargeable dans Pause et options → État du rendu conserve au plus
20 événements (écart, simulation CPU, soumission du rendu CPU, région, qualité,
résolution, programmes, géométries et textures). Les temps CPU ne mesurent pas
le GPU. Aucun compte, identité ou contenu de sauvegarde n'est exporté.
Les compteurs de rendu incluent maintenant la réflexion.

Validation seconde passe : suite complète 2 433 réussis, aucun échec, un ignoré ;
33 tests ciblés réussis après les derniers garde-fous ; navigateur portrait et
paysage réussi, y compris stabilité simulée à 30 FPS, surcharge, reprise,
modes manuels et export JSON dans le menu paysage. Ces fenêtres synthétiques
vérifient la décision du contrôleur ; elles ne sont pas un benchmark du Samsung.

`france-reference/` contient quatre vues du vrai Hameau du Rivage · Hauts des Alpes :
ensemble, rue, place et entrée. Mode fluide explicite, 844×390, DPR 1, heure fixe.
Les budgets et l'état du streaming sont dans `report.json`. Le village demeure
clairsemé : cette base fixe rend les prochaines améliorations comparables et
n'est pas une validation artistique AAA. Aucun agrandissement du monde n'a été
engagé avant la validation téléphone.
