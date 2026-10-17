# Monde du 3B — vérité de livraison et critères de finition professionnelle
Dernier contrôle : 17 octobre 2026 · projet web 3B International

## Trois statuts à ne plus confondre
1. **Codé** : un système existe et ses tests unitaires passent.
2. **Jouable validé** : le vrai jeu a été parcouru sur PC + téléphone, avec des captures et scénarios réussis.
3. **Finition professionnelle approuvée** : les graphismes, les sons, les animations, l'expérience du joueur et la stabilité longue durée ont été examinés ensemble par des humains ; une version publique précise a été vérifiée.

L'existence de huit territoires, de boss à trois phases et de milliers de tests n'implique **pas** que le jeu soit terminé artistiquement.

## État réel du monde ouvert
| Périmètre | Présent dans le code | À terminer avant une démonstration AAA |
| --- | --- | --- |
| Cité centrale, Cercle Brisé, huit portails | Hub, navigation, PNJ et services | Composition de scènes, intérieurs vivants, échelle et lumière finale, ville plus dense |
| Kaïs et personnages | Rigs, déplacements, actions, équipements, sauvegardes | Modèles haute fidélité cohérents, animations faciales et mains/armes, dialogues joués |
| France / Justice / Céliane | Enquête, archives, coopération des plateaux, trois phases de boss | Une tranche complète à hauteur de personnage, vraie enquête physique, interactions jouées et cinématiques finales |
| Algérie / Loyauté / Yliane | Convois, vérité difficile, escorte, boss | Caravane animée et interventions d'alliés, déplacements expressifs, lieux distincts |
| Maroc / Noblesse / Naël | Artisanat, cloches, transmission, protection, boss | Ateliers interactifs, manipulation des objets, animations des artisans et boss |
| Tunisie / Courage / Soraya | Sauvetages, rythme des passages, tempête, boss | Traversée réellement spectaculaire, eau et vent, interactions de sauvetage |
| Espagne / Passion / Diego | Rythme, place, moulin, boss | Chorégraphies, foule réactive et animations de combat reconnaissables |
| Italie / Espoir / Alessio | Jardins, chemins, reconstruction, boss | Transformations visibles et persistantes des quartiers, matériaux et chantier interactif |
| Turquie / Foi / Émir | Astrolabes, repères, engagements, boss | Observation et énigmes spatiales véritables, interactions 3D |
| Estonie / Sagesse / Eira | Pistes, faux signes, observation, boss | Forêt plus immersive, indices visuels sur le terrain et ennemis différenciés |
| Monstre de l'Oubli et créatures | Canon narratif, affrontements, effets et modèles partagés | Créatures uniques et reconnaissables, anatomies/locomotions propres, boss final fini et filmé |
| Audio | Neuf thèmes web synthétisés, spatialisation, voix et effets | Direction musicale finale mixée, enregistrements, doublages et séquences synchronisées |
| Multijoueur | Salons et premières interactions partagées | Autorité serveur, coopération dans le même monde, anti-triche et sessions longues |
| Mobile | PWA, contrôles tactiles, qualité auto, rendu WebGL | Samsung S21 / Xiaomi : 30 min de sprint, caméra, combat, chargement, batterie, chaleur et reprise |
| Unreal PC/console | C++ et scripts de préparation | Niveaux natifs, Blueprints, assets finaux, builds client/serveur et QA sur Windows |

## Vrai critère de sortie pour le niveau professionnel

### Tranche France de 15–20 minutes
Le joueur doit pouvoir : 1. entrer dans un Hub monumental ; 2. déplacer Kaïs sans blocage ; 3. choisir et traverser le portail France ; 4. rencontrer Léa et suivre une enquête par actions dans les rues et les archives ; 5. obtenir les preuves sans simple succession de panneaux ; 6. affronter Céliane à trois phases visuellement distinctes ; 7. libérer un fragment ; 8. voir un changement persistant de la Cité.

**Échec de recette** : gel répétitif, symbole/bouton intercepté, boss générique non reconnaissable, passage inaccessible, dialogue illisible, sauvegarde perdue, ou « animation » réduite à un écran de texte.

### Généralisation
Chaque royaume obtient sa propre séquence de démonstration approuvée, avec scène, ennemi/boss, mécanisme jouable, audio et conséquences. Les captures seules ne valident pas la jouabilité.

## Correction précise de cette branche
- L'aura 3D des huit Gardiens utilisait bien une signature nationale, mais ignorait la phase transmise par le jeu.
- Le rendu affiche maintenant l'avancement des phases 1/2/3, la préparation du coup et la libération du Gardien ; il respecte la réduction des animations.
- Toujours trois objets graphiques, aucune lumière ou géométrie supplémentaire, et aucun changement du code serveur de combat.
- Cette correction **n'est pas** la production de nouveaux corps/monstres, textures 4K ni cinématiques AAA.

## Fait/à faire : règle de communication
Tout nouveau bilan distingue **codé**, **testé en navigateur**, **mesuré sur téléphone physique**, **publié sous un SHA vérifié** et **final art validé**. Le mot « terminé » ne doit apparaître qu'à l'étape professionnelle effectivement reçue.
