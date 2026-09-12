# Nexus cinéma — intégration de la référence validée

Demande du propriétaire : intégrer le rendu des images dans l'application réelle, et non générer une nouvelle maquette.

## Périmètre
- Parcours Passeport → tunnel Matrix → Nexus → huit pays / ORIGINE.
- Scène illustrée 2,5D en mode Cinéma : visuel approuvé recadré, encodé en WebP, commandes React actives et éclairage animé.
- Huit points de sélection dans le décor, galerie d'architectures lisible et huit sceaux reliés à la progression réelle.
- ORIGINE conserve ses conditions canoniques ; la consultation de sa porte ne la déverrouille pas.
- Le mode 3D existant reste disponible par un bouton. En mode Cinéma, sa boucle GPU est arrêtée ; le tunnel reste rendu par son shader.
- Habillage du passeport renforcé sans remplacer le portrait original ou les coordonnées du bouton d'entrée.
- Tunnel enrichi de panneaux architecturaux or/bleu. Introduction facultative et réellement suspendue par Pause.

## Conservation
Aucun changement aux comptes, à Supabase, au modèle de sauvegarde, aux récompenses, au moteur Origins, à la boutique, à la photo ou à l'accueil. La navigation reste confiée à `useNexusJourney`.

## Images
La source a été fournie et validée par le propriétaire dans la conversation. SHA-256 : `bee77ce31f829943bf157cf55e3397eaa8dd21375298a96f2bc88390066edb97`.
Recadrage pour exclure les barres de téléphone et l'ancienne navigation dessinée. Les images finales sont conservées dans le dépôt et servies par l'application ; aucun lien signé externe n'est requis en production. Le manifeste contient les dimensions, empreintes et poids exacts.

Ce rendu est un décor illustré interactif avec effets, pas une reconstruction photoréaliste en 3D de l'ensemble du monde ouvert. Les contrôles, textes importants, destinations et conditions de progression restent du code vivant.

## Vérifications prévues
`npm test`, `npm run build`, contrôle navigateur historique `verify-nexus.mjs` et nouveau `verify-nexus-cinema.mjs` : chargement réel des images, 320/360/390/768/1440 px, neuf points de sélection, retour au passeport, navigation France, mode 3D, pause, mouvements réduits et absence de débordement horizontal.
Les résultats sont à lire dans les workflows et leurs rapports ; ce document seul ne certifie ni leur succès ni la publication. Aucun test sur Samsung physique n'est revendiqué.
