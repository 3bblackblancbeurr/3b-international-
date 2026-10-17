# Monde du 3B — Dossier de livraison Audio & Décors Master
Date : 17 octobre 2026 · base GitHub `e742986` · branche `feat/world-eight-realms-audio-master-20261017`

## Objectif produit
Une expérience qui mérite un rendez-vous professionnel : stabilité, lisibilité des scènes, son vivant, valeur du gameplay et preuves de fonctionnement **dans le moteur réel**. Les huit royaumes sont une fiction respectueuse des pays d'inspiration. L'objectif est de renforcer le jeu déjà en place, pas de vendre des images conceptuelles comme une preuve AAA.

## Améliorations techniques de cette livraison
- **8 paysages sonores** localisés à l'emplacement réel de leurs provinces, 12 villages par royaume, cours des Gardiens et relais, avec sources nommées et volumes spatialisés.
- Les **neuf motifs 3B existants** sont conservés et complétés par une réponse musicale douce en exploration. Intensité adaptée à la nuit, la pluie, l'intérieur, le combat et les Gardiens.
- Transitions liées à la position du personnage, au jour/nuit et à la météo. Les sons ne sont activés que si le joueur accepte l'audio ; le bouton muet interrompt tout. Aucun téléchargement de banque de sons, publicité, achat ou modèle vocal obligatoire.
- **Quatre boucles ambiantes maximum** (1 lit sonore général + 3 lieux voisins), en réutilisant le moteur Web Audio existant et ses procédures de destruction.
- Bruits de pas variables en ville, terre, forêt/montagne et intérieur. Aucune influence sur les dégâts, récompenses ou états serveur.
- **Deux nouveaux groupes de détails 3D instanciés** dans les huit territoires : textiles non figuratifs de leur palette propre et lanternes réagissant à la luminosité. Le mode Fluide réduit ces objets, sans point lumineux 3D ajouté.
- Aucun changement d'identité de membre, de sauvegarde, de monnaie ou de Passeport.

## Couleur sonore propre à chaque royaume
| Pays / Gardien | Vie et ambiance de référence |
|---|---|
| France — Céliane | Arcades, promenades du château, sapins alpins |
| Algérie — Yliane | Terrasses habitées, oasis et vents de montagne |
| Maroc — Naël | Fontaines des riads, vagues littorales, cours des kasbahs |
| Tunisie — Soraya | Jardins des vestiges, côtes, eau des arcades |
| Espagne — Diego | Ateliers, patios, moulins et brises |
| Italie — Alessio | Galeries, pierres historiques et vignes dans le vent |
| Turquie — Émir | Activités de bazar, vallées minérales et ateliers de relais |
| Estonie — Eira | Remparts, oiseaux et feuillage forestier, littoral baltique |

Ces couches sont des créations synthétisées 3B : elles **ne sont pas** des prises de son réelles du pays, ni des bandes orchestrales enregistrées.

## Réception technique obligatoire
1. Tests Node complets, audio, musique, interactions, budget des instances et zéro changement de sauvegarde.
2. Build de production Vite, contrôle Gold Master et sécurité GitHub.
3. Vérification Web Audio réelle en Chromium (déverrouillage après geste, échantillons non silencieux, aucun écrêtage, muet effectif, reprise et fermeture).
4. Captures du vrai moteur sur les huit royaumes, paysage mobile et PC, sans débordement du HUD.
5. Test tactile **Samsung S21** sur trente minutes : joystick + saut simultané, sprint, cinématique, voyages répétés ; relever les frames longues, FPS, mémoire et chauffe.
6. Test Xiaomi : netteté stable, transitions de qualité et retour après veille.
7. Vérifier le déploiement Vercel et le SHA public ; ne pas marquer « publié » sur simple merge.

## Limites et suites pour une vraie présentation AAA
- Les éléments des huit royaumes sont bien dans le code, mais leurs **models, intérieurs, cinématiques et performances physiques** ne sont pas tous Gold Master.
- La bande sonore actuelle est du **WebAudio original de démonstration** ; une production musicale finale reste à produire : interprètes/orchestrations originales licenciées, mixage/mastering, localisation des voix, tests casque/haut-parleur.
- Il faut tester une **tranche France complète** de 10 à 20 minutes avec conséquences visibles, vraie IA, interaction physique, boss Céliane et narration fluide.
- Coopération temps réel, anti-triche, serveur autoritaire, PNJ profonds, huit boss cinématographiques et build Unreal Windows sont **encore des chantiers**.
- Séparer **PR #574** (qualité auto et double-appui tactile, non fusionnée) de cette livraison audio/décors ; ne pas faire croire que son bug est corrigé.
- Aucune dépense récurrente ni abonnement payant ne doit être engagé pour ce lot.

## Politique de publication
Ne fusionner qu'après tests verts et revue visuelle. Ne pas annoncer « 100 % terminé » sans tests physiques, cohérence artistique des huit royaumes, déploiement public et démonstration professionnelle complète.
