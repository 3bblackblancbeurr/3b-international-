# Finalisation 3B — interventions restantes

Mise à jour : 16 septembre 2026.

Ce document ne liste volontairement que les points qui demandent encore une intervention avant la finalisation.

## P0 — Google Search Console

- Le sitemap public existe : `https://3b-international.vercel.app/sitemap.xml`.
- Il contient désormais la page Boutique en plus des autres pages publiques prioritaires.
- Google Search Console n’a encore aucun sitemap soumis pour cette propriété.
- Le suivi d’indexation contient 10 URL : seule la page d’accueil est actuellement indexée ; les 9 autres sont encore `URL is unknown to Google`.
- Action externe nécessaire : authentifier une session Google Search Console puis soumettre `sitemap.xml`. Ensuite contrôler l’indexation des 9 URL restantes.

## P1 — Catalogue commercial et précommandes

- L’endpoint public `/api/catalog` est encore désactivé et renvoie un catalogue vide.
- Il manque les données commerciales définitives : produits, prix, variantes, médias, stocks/limites, précommandes, livraison, retours et liens légaux.
- Ne pas activer le paiement réel tant que le catalogue définitif n’a pas été validé.

## P1 — Vidéo TikTok finale

- Le storyboard vertical 20 s est prêt dans `docs/TIKTOK_3B_20S_STORYBOARD.md`.
- Aucun MP4 final n’est encore présent dans le dépôt.
- L’espace Runway connecté ne dispose actuellement d’aucun modèle vidéo activé ; un moteur vidéo disponible ou un export de montage est encore nécessaire.

## P2 — Monde du 3B : finition visuelle et mobile

- Les quartiers régionaux, quêtes signature, combat, arsenal, pouvoirs, caméra et ambiance ont déjà leur architecture dans le code.
- Les huit gardiens ont été réalignés sur leurs identités et valeurs canoniques au niveau du catalogue d’exécution.
- Il reste à remplacer/valider les visuels finaux des gardiens et à effectuer le passage de finition sur téléphone réel : caméra tactile, lisibilité HUD, cadence d’animation, VFX et performances.

## P2 — Android réel

- La PWA, le manifeste, les icônes normales/maskable et le guide d’installation sont en place.
- Il reste un test propre sur un téléphone Android réel, notamment Samsung : désinstallation, réinstallation, contrôle de l’icône, ouverture via QR/page d’installation et parcours Accueil → Passeport → Monde du 3B → Boutique.

## P3 — Dernier reliquat SEO

- `delete-account.html` est indexable et possède désormais des données structurées.
- L’audit considère encore son volume de texte comme faible ; c’est un point SEO de faible sévérité à enrichir en dernier.
