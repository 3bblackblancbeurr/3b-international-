# 3B Religion — restauration et arbre documentaire

La route Religion est réactivée dans App et le menu, sans supprimer de collection existante. Le dossier public/religion (textes, favoris, notes, quiz, atlas, photos et vidéos) est conservé. Le contenu des versions antérieures absentes de main n’a pas été audité exhaustivement.

## Livré

- Portail L’Arbre depuis l’accueil Religion, le menu et chaque tradition.
- Page /religion-tree.html : Three.js + OrbitControls, rotation, zoom, déplacement, boutons tactiles, clavier et plein écran lorsque disponible.
- 134 notices et 149 relations référencées. Tronc biblique, branches familiales, succession de Matthieu et figures coraniques non rattachées par conjecture.
- Recherche des noms et variantes, quatre parcours, liens vers les personnes apparentées, partage de fiche.
- Vue liste utilisable sans WebGL. Synthèse vocale française des notices selon les voix du système.
- Huit dossiers historiques, impression navigateur, références primaires et institutionnelles.
- Photos existantes avec crédits, deux documentaires existants et liens externes de récitation conservés.
- Chargement 3D séparé de l’application et rendu à la demande, sans boucle permanente. Densité pixel plafonnée à 1,5.

## Limites éditoriales et techniques

Ce corpus est une première sélection ; aucune prétention à couvrir tous les descendants, à dater Adam, ni à fournir des biographies exhaustives. Les notices ont des longueurs variables. Les différences entre traditions et les générations omises chez Matthieu sont indiquées. La lignée de Luc est accessible à sa source et non fusionnée avec Matthieu. Aucune chaîne Ismaël–Muhammad n’est inventée. Aucun portrait de prophète n’est présenté comme authentique.

Les médias externes sont disponibles chez leurs éditeurs ; une licence de republication ne peut pas être déduite d’un lien. La synthèse vocale est une lecture éditoriale, pas un enregistrement sacré. Il n’y a pas de nouveau catalogue d’enregistrements audio ni de films produits dans cette livraison.

## Validation

- Build Vite de production réussi.
- 9 tests ciblés : navigation, intégrité du corpus, acyclicité des filiations, absence de filiations spéculatives, budget Vercel.
- Vérification DOM : trois traditions, liens de l’arbre, huit dossiers, deux documentaires ; recherche Moussa, 134 fiches accessibles sans WebGL, parcours Matthieu, ouverture des fiches et sources.
- Le test général a émis plus de 2 200 réussites mais n’a pas terminé dans cet environnement. Le seul échec observé (budget public) a été corrigé et son test repassé séparément.
- Le navigateur local n’est pas disponible (téléchargement Chromium incomplet) : rendu WebGL réel et gestes Samsung/Xiaomi restent à vérifier sur appareil. Ne pas annoncer une validation visuelle ou mobile complète.

Les sources des nouvelles notices sont intégrées dans src/religion/corpus.json. Les dossiers historiques sont dans src/religion/histories.js ; Vite les émet sous religion/histories.js pour la bibliothèque existante.
