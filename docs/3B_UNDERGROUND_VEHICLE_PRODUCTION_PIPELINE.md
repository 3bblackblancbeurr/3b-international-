# 3B UNDERGROUND — Pipeline de production véhicule

## Objectif
Transformer les concepts 3B Underground en véhicules réellement jouables, validés visuellement et techniquement, sans confondre concept art, proxy et modèle final.

## Séquence officielle pays par pays
1. France — Gold Master de référence
2. Algérie
3. Maroc
4. Tunisie
5. Espagne
6. Italie
7. Turquie
8. Estonie

Chaque pays possède 20 véhicules Gold Master, soit un véhicule héros par ville. Le catalogue canonique totalise donc 160 Gold Masters. Après validation de cette couche, chaque famille de ville peut être étendue vers ses 5 modèles complets et leurs versions S / GT / RS / X / Black Series.

## Huit gates obligatoires
### 1. Catalogue officiel
Nom, ville, famille, silhouette, matières, ADN pays, ADN ville, rôle et chemin d’asset doivent être uniques et figés.

### 2. Concept Gold Master
Le véhicule doit être immédiatement reconnaissable sans son nom. Il doit traduire la ville et le pays par sa silhouette, ses matières, son architecture et sa lumière, pas par un simple drapeau ou une peinture.

### 3. Modèle 3D
Livrables minimum : GLB de carrosserie, collision, roues, cockpit simplifié et LOD. Aucun statut `mesh=true` sans asset GLB réel.

### 4. PBR
BaseColor, Metallic/Roughness, Normal, AO et surfaces transparentes doivent être définis. Les matériaux locaux sont traduits en matériaux crédibles pour le jeu : pierre, bois, métal, verre, textile, céramique, fibre, etc.

### 5. Tuning
Chaque Gold Master reçoit un comportement de base lié à sa ville et au pays, puis doit supporter les systèmes de personnalisation existants : carrosserie, jantes, pneus, optiques, couleurs, matières, intérieur, audio, moteur, aérodynamique, néons, stickers, livrées, stance et réglage PRO.

### 6. Intégration jeu
Le véhicule doit être chargeable dans le garage et dans une course réelle, avec collisions, roues alignées, échelle correcte, caméra correcte et statistiques cohérentes.

### 7. Capture réelle
Une capture ou vidéo du vrai build est obligatoire. Un concept généré n’est jamais une preuve d’intégration.

### 8. Validation Gold Master
Le véhicule n’est validé que si : identité visuelle claire, absence de silhouette générique, performance cible, matériaux cohérents, pas de clipping, pas de régression mobile/desktop et capture réelle approuvée.

## France Gold Master — 20 villes
Paris — 3B Parisienne Montara
Marseille — 3B Marseillaise Pradex
Lyon — 3B Lyonnaise Conflux
Saint-Étienne — 3B Stéphanoise Soleil
Nice — 3B Niçoise Azuria
Toulouse — 3B Toulousaine Ailera
Bordeaux — 3B Bordelaise Tonnelle
Lille — 3B Lilloise Brikane
Nantes — 3B Nantaise Atlantys
Strasbourg — 3B Strasbourgeoise Alsatia
Montpellier — 3B Montpelliéraine Coralia
Rennes — 3B Rennaise Armor
Grenoble — 3B Grenobloise Alpinor
Dijon — 3B Dijonnaise Dorline
Clermont-Ferrand — 3B Clermontoise Volcanis
Le Havre — 3B Havraise Dockera
Rouen — 3B Rouennaise Fluvane
Cannes — 3B Cannoise Palmaris
Annecy — 3B Annécienne Glacera
Reims — 3B Rémoise Crista

## Règles de production
- Ne jamais faire passer un proxy pour un asset final.
- Ne jamais marquer `capture=true` sans image/vidéo provenant du vrai build.
- Ne jamais marquer `validation=true` avant capture et test de conduite.
- Le pays suivant réutilise le pipeline, pas la silhouette du pays précédent.
- Les vingt Gold Masters d’un pays doivent couvrir plusieurs archétypes : GT, roadster, crossover, expédition, industriel, track, halo, urbain, luxe, utilitaire.
- Le langage 3B doit rester commun : luxe, héritage, futur, matières, mouvement et Cercle Brisé.

## Arborescence d’assets attendue
`/public/vehicles/gold-master/<pays>/<ville>/u3b-gm-<pays>-<ville>.glb`

Le code n’assume jamais que cet asset existe : l’état de production sépare explicitement concept, mesh, PBR, tuning, intégration, capture et validation.

## Définition de “terminé” pour un pays
Un pays est terminé seulement lorsque ses 20 véhicules ont :
- GLB réel
- PBR réel
- tuning de base
- intégration garage/course
- capture réelle
- validation finale

La France sert de Gold Master. Les sept autres pays sont répliqués uniquement après validation de la France afin d’éviter de multiplier un mauvais standard visuel.
