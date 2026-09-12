# Passeport Nexus 3B — refonte graphique premium

## Périmètre
Refonte isolée depuis main `a29e46d87984b7bcc4c4c806515b2449f657583d`, à la demande du propriétaire pour publication en production après compilation. La PR 42 diverge de main et contient des travaux indépendants : elle n'est pas fusionnée en bloc.

Seul le parcours du passeport vers le Nexus change. L'accueil, sa photo, le menu, la boutique, les autres jeux, l'avatar, la communauté, les paiements et les données existantes ne sont pas remplacés. L'image originale du passeport, la pluie Matrix et le portrait vivant restent dans PassportVisual.

## Direction visuelle livrée
- Sanctuaire architectural noir profond, bleu nocturne, champagne, relief et lumière contenus.
- Huit architectures vectorielles originales distinctes, avec silhouettes de paysages, matériaux, gardiens et valeurs propres aux pays.
- Porte sélectionnée en grand, fiche du gardien et action explicite « Franchir la porte » ; sélectionner une vignette ne déclenche pas un voyage accidentel.
- Galerie horizontale tactile sur petit écran ; sélection clavier, progression du Cercle et neuvième passage ORIGINE.
- Scanner puis tunnel Matrix en perspective, dans un seul canvas : déplacement avant, glyphes, arêtes, particules. Pas de vidéo téléchargée ni d'effet stroboscopique.
- Pause, mouvements réduits, fermeture clavier, retour au passeport, focus restauré et gestion du défilement.

Ce rendu est une direction graphique vectorielle interactive, pas une promesse de photoréalisme AAA ni une nouvelle modélisation 3D de tous les pays du jeu.

## Fonctionnement conservé et raccordé
Les modules `nexus-flow.js` et `nexus-dialog.js` sont repris des versions auditées de la PR 42 (blobs 280d7f79 et e14f80f9). La navigation passe par le moteur et le journal existants du Monde 3B. Aucun second format de sauvegarde, aucune récompense inventée et aucune remise à zéro.

ORIGINE exige huit sceaux et huit pays reconstruits (étape 3). Une rencontre non terminée n'est pas abandonnée par un changement de porte. Un défi final en cours peut être repris. Les chargements asynchrones sont invalidés après fermeture/changement de compte et les doubles clics sont protégés.

## Budget technique
Aucune dépendance ajoutée. Pas de service tiers d'images ou de polices. SVG et CSS pour le sanctuaire ; canvas 2D pour le tunnel avec DPR plafonné à 1,5, 16 anneaux, 56 glyphes et 72 particules. Arrêt de l'animation dans un onglet masqué et nettoyage des callbacks/observateurs à la fermeture.

## Vérifications effectuées avant soumission
- 31 tests Node du fichier `tests/nexus-premium.test.js` passent localement : destinations canoniques, progression, conditions ORIGINE, rencontres, annulation, journal, stockage, séquence, repli sans canvas.
- Les composants JSX ont passé une compilation syntaxique TypeScript et la feuille de style a été analysée avec PostCSS.
- Le rendu des composants NexusSanctuary/NexusArtwork a été contrôlé sous Chromium aux largeurs 320, 360, 390, 412, 768, 1024 et 1440 pixels : huit portes présentes et aucun débordement horizontal du dialogue.
- Les huit sélections, intentions de navigation, états verrouillé/déverrouillé d'ORIGINE, flèches clavier, fermeture Échap, retour du focus et restauration du défilement ont été exercés dans ce banc local.
- Le véritable moteur canvas du tunnel a dessiné sans erreur et son nettoyage a été exercé.

Limite explicite : le banc visuel local utilise React 16 disponible dans l'environnement pour les composants de présentation, avec progression de test et rappels de navigation instrumentés. Il ne constitue pas un test de l'application complète React 19, des hooks PassportNexus ou d'un compte Supabase réel. La compilation de l'application entière doit être confirmée par Vercel/CI. Aucun test physique Samsung/iPhone, aucune mesure de FPS sur ces appareils, aucun duel multi-appareils effectué.

## Publication
Le statut de publication doit être lu sur le commit et son déploiement GitHub/Vercel ; ce document n'atteste pas à lui seul une mise en ligne. La branche isolée permet un retour arrière du seul Nexus. Le DOM porte `data-nexus-version="premium-20260912"` pour identifier la nouvelle interface.
