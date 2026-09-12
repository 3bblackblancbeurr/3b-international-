# Passeport / Nexus 3B — refonte visuelle premium

## Livraison dans la branche, pas validation de production

Branche : `chatgpt-improvements`, PR #42. Cette refonte ne fusionne pas main et ne remplace pas le moteur Origins publié dans main. Elle complète et conserve les corrections de navigation du commit `cb2a8fd75fbfd505e0c7e246ddde0a9a9f947b78`.

## Ce qui est effectivement ajouté au code

- `src/components/nexus-scene.js` : vraie scène Three.js chargée à l'ouverture du passeport. Chambre circulaire, sol texturé procédural, incrustations dorées, piliers, Cercle Brisé suspendu, huit portails modelés, neuvième seuil ORIGINE séparé.
- Tunnel en perspective : 26 anneaux instanciés, intérieur cylindrique Matrix et lignes de fuite. Avancée vers le Nexus, sans vidéo externe. Introduction de 950 ms + 3 300 ms hors pauses, bouton Passer, mode calme.
- Huit silhouettes distinctes, chacune associée à sa couleur, son pays, sa valeur et au gardien du récit 3B. Approche de caméra à la sélection ; bouton séparé pour réellement traverser.
- Nouveau langage visuel noir profond / or champagne / bleu, titrage éditorial, hiérarchie de lecture, commandes compactes, choix des pays en bas, indicateur des sceaux et reconstructions provenant de la sauvegarde réelle.
- Écran de révélation ORIGINE et seuil modélisé. Il conduit au défi de l'Union EXISTANT du moteur classique. Ce travail n'ajoute pas un neuvième monde ouvert jouable ni une nouvelle campagne.
- Modes Auto, Fluide, Détaillé ; résolution plafonnée, baisse de résolution automatique, pause, réduction des mouvements, repli graphique SVG en cas d'échec WebGL et nettoyage des ressources à la fermeture.
- Le passeport animé d'origine et son illustration sont conservés. Aucun changement du menu d'accueil, des autres pages ou des règles de récompenses.

## Raccord fonctionnel conservé

Le nouveau composant `PassportNexus.jsx` réutilise `mountNexusDialog` et `enterNexusWorld`, sans remplacer ces helpers. `nexus-data.js` délègue le verrou à `nexusProgress` du moteur classique.

ORIGINE exige huit sceaux ET huit pays reconstruits, ou permet de reprendre une rencontre finale déjà engagée. Une visite n'attribue aucune clé. Reprendre le monde ne crée aucune commande. Une rencontre non terminée n'est pas abandonnée par un changement de porte. Double appui, fermeture et changement de compte sont protégés pendant les opérations asynchrones.

## Contrôles exécutés pour cette refonte

1. `node --test tests/nexus-premium.test.js` : **18 tests réussis, 0 échec**. Pays/valeurs, huit silhouettes, doublons et données invalides, seuils 7/8, reconstructions, finale déjà achevée, délégation au moteur, reprise de rencontre, changement via le hub, absence de visite doublonnée, annulation de requête et validation du trajet avant écriture.
2. Les fichiers locaux testés ont été comparés aux blobs GitHub : `nexus-flow.js` = `280d7f79a5b16e1c75b5fd46996fc7aea86904a7`, scène corrigée = `7c3db0e7c615f3489a43122f869f8d90b9e985d9`, composant avec restitution de focus = `ee15f11471f60ea5b9b63a701b68b4c05f3a5b9f`.
3. Analyse syntaxique JSX par TypeScript : aucune erreur ; `node --check` de la scène : réussi ; analyse de la feuille CSS par PostCSS : réussie.
4. Contrôle Chromium d'une **fixture DOM/CSS isolée**, construite depuis le JSX avec hooks et icônes simulés : 12 configurations (vue générale, pays, ORIGINE × 320×640, 390×844, 844×390, 1440×900), sans débordement horizontal, huit sélecteurs présents, bouton principal présent, verrou ORIGINE conforme aux données injectées. Deux captures du rendu SVG de secours ont été relues. Cela ne constitue PAS un essai de l'application React ni du rendu Three.js complet.
5. Un premier déploiement Vercel a été confirmé réussi pour `0dd7332599d2ced0ea27c199fbcdae51d05d0070`. Les corrections suivantes portent sur le sens d'avancée du tunnel, les bornes définies des fondus GLSL, le focus et les tests. Vérifier le statut du dernier head avant toute validation.

## Limites et blocages restant avant fusion

- **Pas de validation visuelle de la scène 3D complète.** Le Chromium local ne fournit pas de contexte WebGL dans cette session. L'accès authentifié Vercel a échoué : droits insuffisants sur l'équipe qui possède le projet. Aucune protection n'a été désactivée.
- Tester sur une preview autorisée le vrai parcours React + Three : ouverture, tunnel, huit approches caméra, pays sélectionné, retour, fermeture/réouverture, phase ORIGINE 0/7/8, mode calme, changement d'orientation, compte/invité, erreurs de console et perte de contexte WebGL. Mesurer fluidité et mémoire sur Samsung physique. Aucune fréquence d'image réelle n'est garantie par le simple plafond du moteur.
- **Conflit de moteur avec main** : la branche utilise encore `world/WorldPage.jsx` et la sauvegarde classique ; main utilise `world/WorldEntry.jsx` et Origins par défaut. Résoudre en préservant Origins et en branchant l'affichage de progression ET les destinations sur le même moteur. Ne pas assimiler silencieusement les clés des deux sauvegardes.
- Les cinématiques, fonctions de suppression de compte et éléments Google Play déjà inclus dans PR #42 ont leur propre validation, décrite dans `PASSPORT_NEXUS_PR42_REVIEW.md`. Cette refonte ne les approuve pas.

La scène est procédurale et reste à relire artistiquement en WebGL. Ce n'est pas une livraison certifiée photoréaliste ou « qualité grand studio ». Les modèles, lumières et mouvements sont réellement codés ; leur présence dans la branche ne signifie pas qu'ils sont déjà visibles dans l'application publique.
