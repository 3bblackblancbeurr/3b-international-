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

- Suite locale : 1 646 réussites, 0 échec, 1 test Swift ignoré faute de compilateur Windows. Le contrôle Swift reste nécessaire dans la CI macOS.
- Build de production réussi ; audit dépendances production : 0 vulnérabilité.
- Audit SQL statique : 200 migrations, 178 tables, 129 fonctions SECURITY DEFINER, 0 problème détecté.
- Test PostgreSQL embarqué exécutant réellement la nouvelle migration : conflit, reçu idempotent, refus d'un reçu altéré, isolation par compte, révocation des écritures et de la RPC côté authenticated.
- Contrôles navigateur téléphone 390 × 844 et bureau, menu, recherche et navigation. Pas de débordement horizontal sur les tailles contrôlées.

## État distant observé

Les six workflows du main de référence sont verts ; Vercel indique un déploiement réussi.
L'audit en lecture seule de Supabase trouve zéro table publique sans RLS, des index uniques sur le compte et l'identifiant Passeport, et zéro identifiant Passeport dupliqué.
La base distante ne possède pas encore la révision ou la RPC des sauvegardes Jeux et autorise encore INSERT/UPDATE au navigateur sur cette table.

## Activation et recette distante

Recette HTTP réelle en staging : deux comptes authentifiés, deux appareils, conflit et fusion, réponse perdue et reçu idempotent, hors ligne/reconnexion, refus des Coins forgés, écritures directes et lectures intercomptes. Les sept contrôles réussissent. Le staging Nosbloc utilise un nom distinct pour le validateur de session afin de conserver sa fonction préexistante ; les tables de sauvegarde et fonctions de la recette reproduisent la frontière production. Le schéma complet économie/inventaire n’a pas été cloné.

Production : migration réellement appliquée sous le numéro 20261003215516, puis member-api version 11, JWT obligatoire. Le manifeste applied contient le hash exact. Activation frontend par fusion GitHub puis déploiement Vercel.

Les anciennes écritures directes sont révoquées ; les clients doivent recharger la nouvelle application pour synchroniser. Leurs caches locaux sont conservés.
