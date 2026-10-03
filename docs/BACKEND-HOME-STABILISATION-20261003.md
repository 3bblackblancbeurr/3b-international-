# Stabilisation et accueil — 3 octobre 2026

Base vérifiée : `7cc2fdd710821f73b5e04febcf8633ff8117092f`.

## Changements

- Sauvegardes Jeux du compte via `member-api`, avec révision serveur, comparaison atomique, reçu UUID et reprise après réponse perdue.
- Fusion des records et des campagnes entre appareils ; checkpoints successifs sans double comptage, même pendant une requête en cours.
- Cache local par compte, conservation hors ligne et réconciliation des résultats dans GamesHub.
- Inventaire indisponible distingué d'un inventaire vide, sans bloquer le Passeport. Coins inconnus affichés avec un tiret.
- Accueil centré sur la Cité Origine et les trois parcours principaux. Retrait de l'atlas décoratif, des grandes cartes d'installation, du catalogue de modules en préparation et du footer promotionnel.
- Navigation plus sobre ; installation, recherche, modules en préparation et Secret restent accessibles dans le menu.
- Tests Python portables sous Windows, sorties UTF-8 et attentes visuelles mises à jour.

## Validation

- Suite locale : 1 645 réussites, 0 échec, 1 test Swift ignoré faute de compilateur Windows. Le contrôle Swift reste nécessaire dans la CI macOS.
- Build de production réussi ; audit dépendances production : 0 vulnérabilité.
- Audit SQL statique : 200 migrations, 178 tables, 129 fonctions SECURITY DEFINER, 0 problème détecté.
- Test PostgreSQL embarqué exécutant réellement la nouvelle migration : conflit, reçu idempotent, refus d'un reçu altéré, isolation par compte, révocation des écritures et de la RPC côté authenticated.
- Contrôles navigateur téléphone 390 × 844 et bureau, menu, recherche et navigation. Pas de débordement horizontal sur les tailles contrôlées.

## État distant observé

Les six workflows du main de référence sont verts ; Vercel indique un déploiement réussi.
L'audit en lecture seule de Supabase trouve zéro table publique sans RLS, des index uniques sur le compte et l'identifiant Passeport, et zéro identifiant Passeport dupliqué.
La base distante ne possède pas encore la révision ou la RPC des sauvegardes Jeux et autorise encore INSERT/UPDATE au navigateur sur cette table.

## Activation coordonnée requise

La migration `20261003233000_member_game_save_cas_v1.sql` reste dans le manifeste pending. Ce fichier n'a pas été appliqué à la production par ce travail.

1. Tester la migration et la fonction member-api sur un environnement Supabase staging, puis une Preview Vercel de la branche.
2. Rejouer deux comptes et deux appareils, réponse perdue, hors ligne/reconnexion et reprise de l'ancienne sauvegarde. Les tests locaux ne remplacent pas cette recette réelle.
3. Programmer le basculement coordonné migration → member-api → frontend. La révocation SQL des anciens droits bloque les anciennes écritures directes ; les anciens clients doivent recevoir la mise à jour avant de retrouver la synchronisation. Leurs copies locales sont conservées.
4. Après confirmation du déploiement, enregistrer le numéro réellement attribué par Supabase et le hash SQL dans APPLIED_MIGRATIONS_SHA256.json, puis retirer la migration du manifeste pending.
5. Vérifier la CI du commit final et le déploiement Vercel. Ne pas annoncer le nouveau backend actif tant que la recette distante n'est pas validée.

Les checkpoints d'une même partie modifiés simultanément sur deux appareils ne peuvent pas tous être joués en parallèle : la branche locale est retenue en cas de conflit sur cette partie, tandis que les records durables sont fusionnés. Les sauvegardes invité restent liées à l'appareil ; le protocole compte n'attribue aucun Coin ni XP économique depuis le navigateur.

Le budget Vercel passe pour l'intégration Git. L'estimation d'upload CLI dépasse le plafond Hobby utilisé par le garde ; garder le déploiement via Git. Le build conserve ses avertissements de chunks JavaScript volumineux.
