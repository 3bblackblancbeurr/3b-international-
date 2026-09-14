# 3B Underground — Atelier de personnalisation ultra

Le système est conçu avant les meshes définitifs. Chaque choix esthétique est stocké sous forme de données (`assetRef: null` aujourd'hui). Quand les modèles 3D arriveront, les slots seront branchés à des sockets, matériaux, variants ou meshes sans refaire la logique de garage.

## Portée

Le catalogue couvre 9 familles : carrosserie, roues/stance, phares/lumières, peinture/matières, stickers/livrées, habitacle, audio/multimédia, baie moteur et détails/identité.

Il comprend 50 slots et près de 300 variantes prêtes à recevoir les futurs assets : pare-chocs, ailes, capot, toit, aileron, diffuseur, jantes, pneus, étriers, phares, DRL, feux arrière, néons, peinture, carbone, teinte des vitres, fauteuils, matières des sièges, volant, levier/palettes, planche de bord, compteurs, ciel de toit, tapis, arceau, pédalier, poste radio/écran, haut-parleurs, caisson, ampli, installation coffre, cache moteur, admission visible, barre anti-rapprochement, durites, bouchons, plaque, badges, etc.

## Peinture et lumière

Couleurs indépendantes : primaire, secondaire, accent, intérieur, surpiqûre, étriers et lumière. Finitions : brillant, satin, mat, métallisé, nacré, candy, chrome, iridescent. Carbone : classique, forgé, large weave, bleu ou or.

Le néon est zoné : avant, arrière, gauche, droite, avec couleur, intensité et modes steady / soft / beat / chase. L'éclairage intérieur possède plusieurs zones : tableau de bord, portes, pieds, console, toit, sièges.

## Livrées

Le moteur accepte jusqu'à **128 couches de vinyle** indépendantes avec type, forme, texte, couleurs, opacité, position, échelle X/Y, rotation, miroir et surface ciblée. Les stickers sont séparés et limités à 64 éléments.

## Stance

Réglages visuels : hauteur de caisse, diamètre et largeur de roue, voie avant/arrière, carrossage avant/arrière et déport avant/arrière. Ces données sont séparées du mesh final et pilotent déjà le proxy modulaire. Les futurs meshes utiliseront exactement les mêmes valeurs.

## Performance

Le tuning mécanique passe à 18 familles : moteur, admission, ECU, carburant, échappement, turbo, intercooler, refroidissement, embrayage, transmission, différentiel, pneus, freins, suspension, aéro, allègement, nitro et électronique.

Le réglage PRO stocke : rapport final, balance de freinage, suspension, différentiel, équilibre aéro, pression pneus, carrossage, pincement, hauteur, ressorts, compression/détente, barres antiroulis, direction, diff accel/decel, antipatinage, ABS, launch control et boost turbo.

## Plateforme automobile modulaire

Le véhicule n'est plus pensé comme un mesh monolithique. Il utilise maintenant une plateforme logique : `u3b-modular-platform-s1`.

Cette plateforme définit :
- une enveloppe dimensionnelle en mètres ;
- les points de montage de chaque famille de pièces ;
- les canaux de matériaux ;
- les surfaces de decals/livrées ;
- les transformations de stance ;
- les règles de compatibilité des futures pièces ;
- la différence entre « données prêtes » et « art final prêt ».

Les 50 slots sont liés à des anchors nommés pour carrosserie, roues, éclairage, habitacle, audio, coffre, baie moteur et identité.

## Proxy modulaire actuel

`ModularVehicleProxy.js` remplace le vieux bloc voiture générique dans le rendu de course. Il consomme directement la sauvegarde réelle de personnalisation.

Même sans carrosserie finale, il peut déjà refléter :
- couleurs principale/secondaire/accent ;
- hauteur/voie/carrossage/diamètre et largeur des roues ;
- finition de jante et couleur d'étrier ;
- aileron ;
- arceau ;
- sièges ;
- écran/poste radio ;
- caisson dans le coffre ;
- phares et feux ;
- néons et leurs animations ;
- plusieurs détails d'identité.

Ce proxy n'est pas un modèle final : c'est le banc d'essai de l'architecture.

## Handoff vers les vrais modèles 3D

`vehicleAssetPack.js` définit le format de pack artistique futur. Il permet d'associer chaque `optionId` déjà sauvegardé à un vrai `assetRef` (GLB/GLTF aujourd'hui, assets Unreal plus tard), puis de résoudre l'assembly final sans changer les sauvegardes existantes.

Le pack final sépare aussi les assets centraux : châssis, coque, collision, cockpit, baie moteur et coffre.

La spécification complète de production est dans `docs/3B_UNDERGROUND_MODULAR_VEHICLE_PLATFORM.md`.

## Architecture future des modèles 3D

Chaque véhicule définitif devra respecter le contrat de plateforme et fournir ses pièces compatibles. Un asset pourra être un mesh, un matériau, un paramètre de shader, une texture, un decal ou un profil d'éclairage.

Aucune logique de carrière, de paiement, de sauvegarde ou de tuning ne devra dépendre du nom d'un mesh.
