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

## Passe arènes des huit royaumes — 17 octobre 2026

**Défaut reproduit sur captures réelles :** les huit arènes étaient presque identiques, avec sept petites colonnes, des pavés uniformes, un grand vide et peu de détail lisible. Les Gardiens avaient des phases de combat codées mais leur environnement était trop générique.

**Transformation dans le moteur réel :**
- Chaque royaume reçoit un blason géométrique unique basé sur sa valeur (Justice / liens / noblesse / courage / rythme / reconstruction / repères / branches), gravé dans ses sept piliers et visible sous les pieds du joueur.
- Sept piliers d'environ 19 mètres, six liaisons monumentales laissant un accès libre, et huit secteurs de pierre ouvragés autour du boss. Aucune nouvelle texture téléchargée, ni éclairage 3D supplémentaire.
- Les incrustations utilisent la matière partagée et la légère émission déjà existante du moteur en soirée ; aucun nouveau shader, aucune nouvelle collision au sol ni nouvelle boucle de rendu.
- Les huit territoires ont des palettes cohérentes et les trois phases de boss pilotent désormais directement la réaction de l'aura.
- Toutes les géométries continuent d'utiliser **un seul tirage de matériau de maçonnerie**, restent dans le budget de sommets mobile, préservent le cercle de combat de 40 mètres et le passage principal.
- Captures QA à partir de vraies positions des cours, et tests de géométrie / navigation / entrée des pays. Ces captures ne sont **pas** de l'art cinématique final.

**À ne surtout pas déclarer terminé :** les véritables modèles distinctifs du Monstre de l'Oubli et des créatures, l'animation expressive des huit Gardiens, le doublage final, les environnements denses et les scènes jouées de chaque campagne. Ce sont les prochains lots de production artistique.

**CI :** un test d'interface GitHub a présenté une attente anormalement longue sur le clic *Pause et options* après une reprise de sauvegarde, sur Chromium avec GPU logiciel. Le test maintient désormais le rendu privé avant de cliquer réellement (pas de clic forcé), afin de conserver la même vérification de restauration des données sans surcharger le compositeur.

## Nouvelle passe scènes de France — objets physiques de l'enquête
- Les quatre étapes `rumor`, `evidence`, `coordination` et `post` affichent maintenant quatre pièces 3D distinctes : registre à témoignages, folio d'archives et sceaux, balance des deux plateaux, dossier signé.
- Leur forme change lorsque le **moteur de campagne** avance sur un marqueur déjà affiché ; les ressources anciennes sont libérées, sans modifier la preuve, l'inventaire ou la sauvegarde.
- Trois lots de matériaux par objet, sans nouvelle texture réseau, avec un test des quatre modèles en vrai navigateur WebGL et captures locales.
- Les colonnes des Gardiens reçoivent des flûtages verticaux et détails d'arches, **27 éléments intégrés dans le seul maillage existant**, soit 7 893 sommets et 4 356 triangles par cour : en dessous des limites testées (8 000/5 000).
- Validation locale : 13/13 tests ciblés (y compris non-régression du livre d'origine), contrôle de cohérence artistique réussi, rendu navigateur France et Maroc après enrichissement géométrique réussi.
- **Limite explicite** : ces props ne remplacent pas la mission entièrement jouée en 3D. Leur qualité est encore stylisée, pas finale, et le Samsung S21 doit encore subir un test de sprint prolongé.
