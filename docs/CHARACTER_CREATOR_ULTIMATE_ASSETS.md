# Character Creator Ultimate — assets futurs

Ce document décrit uniquement les assets manquants. Leur absence ne doit jamais être présentée comme une fonctionnalité terminée.

## Visage
Morph targets futurs attendus : hauteur/longueur du visage, crâne, front, tempes, yeux, sourcils, bouche, lèvres, menton, pommettes, joues et oreilles. Le registre technique se trouve dans `src/world/avatar-capabilities.js`.

## Cheveux et barbe
Le build actuel possède 7 variantes de cheveux réellement présentes. Les coiffures supplémentaires et les barbes séparées restent des slots futurs jusqu’à livraison de meshes compatibles avec les six rigs `traveller-0..5.glb`.

## Vêtements modulaires
Slots préparés : top, outerwear, pants, shoes, cape, headwear, bag, belt, gloves, jewelry. Les modèles hoodie 3B, worker, polo, veste, qamis urbain, streetwear premium et collections pays nécessitent des GLB/GLTF dédiés avec noms de matériaux cohérents.

## Matériaux
Jean, laine, maille, velours et tissu technique restent masqués tant que leurs albedo/normal/roughness maps ne sont pas livrées.

## Armes
Les 16 armes utilisent encore un fallback procédural en 3D. Les futurs GLB doivent fournir une origine/pivot stable au grip, une échelle métrique cohérente et, idéalement, des repères `grip_primary`, `grip_secondary`, `holster`.

## IK
L’IK deux mains complet reste à réaliser avec les futurs grips secondaires validés. Les poses actuelles restent un fallback stable.

## Règle de livraison
Un asset n’est activé dans l’UI que s’il existe réellement, se charge sans erreur, respecte le rig/pivot attendu et passe les tests Android/iOS.
