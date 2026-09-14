# 3B Underground — Atelier de personnalisation ultra

Le système est conçu avant les meshes définitifs. Chaque choix esthétique est stocké sous forme de données (`assetRef: null` aujourd'hui). Quand les modèles 3D arriveront, les slots seront branchés à des sockets, matériaux, variants ou meshes sans refaire la logique de garage.

## Portée

Le catalogue couvre 9 familles : carrosserie, roues/stance, phares/lumières, peinture/matières, stickers/livrées, habitacle, audio/multimédia, baie moteur et détails/identité.

Il comprend plus de 45 slots et plus de 250 variantes prêtes à recevoir les futurs assets : pare-chocs, ailes, capot, toit, aileron, diffuseur, jantes, pneus, étriers, phares, DRL, feux arrière, néons, peinture, carbone, teinte des vitres, fauteuils, matières des sièges, volant, levier/palettes, planche de bord, compteurs, ciel de toit, tapis, arceau, pédalier, poste radio/écran, haut-parleurs, caisson, ampli, installation coffre, cache moteur, admission visible, barre anti-rapprochement, durites, bouchons, plaque, badges, etc.

## Peinture et lumière

Couleurs indépendantes : primaire, secondaire, accent, intérieur, surpiqûre, étriers et lumière. Finitions : brillant, satin, mat, métallisé, nacré, candy, chrome, iridescent. Carbone : classique, forgé, large weave, bleu ou or.

Le néon est zoné : avant, arrière, gauche, droite, avec couleur, intensité et modes steady / soft / beat / chase. L'éclairage intérieur possède plusieurs zones : tableau de bord, portes, pieds, console, toit, sièges.

## Livrées

Le moteur accepte jusqu'à **128 couches de vinyle** indépendantes avec type, forme, texte, couleurs, opacité, position, échelle X/Y, rotation, miroir et surface ciblée. Les stickers sont séparés et limités à 64 éléments.

## Stance

Réglages visuels : hauteur de caisse, diamètre et largeur de roue, voie avant/arrière, carrossage avant/arrière et déport avant/arrière. Ces données sont séparées du mesh final et pourront ensuite piloter bones, sockets et géométrie procédurale.

## Performance

Le tuning mécanique passe de 8 à 18 familles : moteur, admission, ECU, carburant, échappement, turbo, intercooler, refroidissement, embrayage, transmission, différentiel, pneus, freins, suspension, aéro, allègement, nitro et électronique.

Le réglage PRO stocke : rapport final, balance de freinage, suspension, différentiel, équilibre aéro, pression pneus, carrossage, pincement, hauteur, ressorts, compression/détente, barres antiroulis, direction, diff accel/decel, antipatinage, ABS, launch control et boost turbo.

## Architecture future des modèles 3D

Chaque véhicule définitif devra fournir un `VehicleCustomizationManifest` listant les slots compatibles et leurs points de montage. Un asset pourra être un mesh, un matériau, un paramètre de shader, une texture, un decal ou un profil d'éclairage.

Aucune logique de carrière, de paiement, de sauvegarde ou de tuning ne devra dépendre du nom d'un mesh.
