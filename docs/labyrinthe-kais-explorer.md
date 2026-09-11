# Kaïs — nouvelle apparence dans le Labyrinthe

Le personnage utilise désormais une illustration de jeu détaillée : visage découvert, cheveux ondulés, silhouette athlétique, veste bleu nuit, col ivoire, liserés dorés, sangle et bottines en cuir. Son corps mesure environ 88 unités de jeu, avec des mains, un visage et des vêtements lisibles dans le cadrage mobile. Une ombre elliptique et un ancrage stable au sol remplacent l'ancien socle circulaire.

## Asset et animation

- Artwork original créé avec l'outil intégré `image_gen.imagegen` en mode natif. La génération retenue est un PNG avec véritable transparence, sans fond ajouté au jeu.
- Asset livré : `public/games/kais-explorer.webp`, 1173 × 844 pixels. Les cinq rangées utilisées sont conservées ; les vues de gauche sont des miroirs cohérents des vues de droite.
- Chaque vue comporte une pose immobile et six poses de marche. Le dos, les profils et le visage sont distincts. La marche suit toujours la distance parcourue et la rotation du moteur existant.
- `maze-hero-frames.js` contient les rectangles et ancrages mesurés sur l'illustration. Les proportions sont conservées par une échelle uniforme ; la tête et le torse ne se déplacent pas arbitrairement d'une image à l'autre.
- `maze-hero.js` centralise le rendu et les directions. Le menu montre une vue du même personnage, extraite du même asset. Aucune bibliothèque d'animation ou de 3D n'est ajoutée au navigateur.
- L'ancien `kais-maze.webp` n'est plus livré. Les personnages des autres jeux et le modèle du Monde 3B restent inchangés.

## Brief artistique retenu

Atlas transparent de personnage pour une aventure vue légèrement du dessus. Kaïs, jeune explorateur adulte à la peau olive et aux cheveux noirs ondulés, proportions naturelles athlétiques d'environ 5,5 têtes, visage expressif découvert. Veste d'explorateur bleu nuit et touches sarcelle, col ivoire, finitions dorées, sangle et sacoche de cuir, pantalon sombre et bottines cognac. Illustration de jeu peinte avec volumes doux, plis de tissu, anatomie convaincante, silhouette nette et lisible sur des ruines sombres. Pas de géométrie cubique, de silhouette filiforme, de capuche masquant le visage ou d'arme. Caméra orthographique inclinée d'environ 25 degrés. Identité, échelle et éclairage identiques dans chaque pose. Une pose de repos et un cycle de six poses par direction, mouvement opposé des bras et des jambes, fond véritablement transparent, sans texte ni quadrillage.

## Vérification

Tests des rectangles, des ancrages et des directions, puis de la simulation et des 100 niveaux. Parcours navigateur : vue de face, dos et profils, animation à la marche et arrêt, contrôle tactile émulé, carte, victoire, passage au niveau suivant et sauvegarde restaurée. Contrôle du menu et du rendu sur ordinateur, mobile et paysage. Les pixels de l'asset publié sont comparés au fichier local avant la livraison.
