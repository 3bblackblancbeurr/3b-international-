# Monde 3B — consolidation contrôlée du 20 septembre 2026

## Périmètre

Demande de Zakaria : réunir les corrections du Monde 3B sans Work, sans Excel et sans pousser sur `main`.
Branche candidate isolée : `chatgpt-improvements-world-account-safe-20260920`. La branche de consolidation partagée a évolué concurremment ; elle n’a pas été écrasée. Le correctif de collision Map/MapIcon du commit 4f7164c a été repris. Les résultats CI ci-dessous concernent la version finale ; les 629 tests cités sont le contrôle local précédent.
Base distante : `a1d238a19ff24d249c22c474b4c7263f626c9682`.

Sources réunies et réconciliées : lot France/Justice de la PR 103, déblocage Ville corrigé `ba1f8d2ec7892d79738c21e6e4665142e863231e`, identité Passeport PR 106, cinématiques PR 107/108 et créateur/armes de la PR 102. L'intégration conserve les transports, missions, quartier vivant, audio V5 et gardiens présents dans la base plus récente. Léa reste l'habitante de France ; Céliane reste la Gardienne de Justice (C165).

## Corrections propres à cette consolidation

- Requêtes Ville invalidées après changement de compte, fermeture ou remplacement de requête ; états de chargement et d'erreur distincts d'une ville inexistante.
- Deux interfaces Ville fondées sur le pays canonique du Passeport et conservation du nouveau portail Nexus/Ville.
- Brouillons, looks et portraits du personnage séparés par compte ; aucune récupération automatique d'un portrait ancien sans propriétaire.
- Capture de portrait attachée au bon composant et annulée à sa fermeture.
- Cinématique d'ouverture raccordée à la première création du personnage ; conservation des cinématiques Justice et retour à la Cité.
- Tests historiques mis en cohérence avec le shader v4 et le plafond adaptatif réellement implémenté, sans désactiver les contrôles.

## Résultats réellement exécutés

`npm run verify` : **629 tests réussis, 0 échec**, puis compilation Vite de production réussie (Node 22.16.0). Les 68 tests ciblés du personnage, des armes et de l'isolation des comptes sont également réussis.

Le build signale encore des fichiers JavaScript dépassant 500 kB, notamment le matériau avatar. La réussite des tests ne constitue pas une certification de fluidité mobile ni une partie réellement jouée.

## Blocages de publication constatés

- Le connecteur Vercel refuse l'accès au projet/à l'équipe avec une erreur 403. Aucun remplacement de l'application publique n'est attesté par ce travail.
- Le contrôle navigateur est indisponible dans cet environnement ; aucun test sur téléphone ou partie utilisateur complète n'a été effectué.
- Le moteur serveur `world-engine` récupéré en version 21 utilise un protocole de commande différent du journal `{device, commands}` présent dans le client du dépôt. Les contrats de sauvegarde, les nouvelles options avatar et les accusés de cinématiques doivent être alignés puis testés avant promotion publique. Ne pas redéployer aveuglément l'ancien template serveur du dépôt.
- Supabase confirme les migrations de prérequis Souvenir et d'origine canonique du Passeport. Cela ne certifie pas toute la compatibilité du moteur Monde. Aucune donnée utilisateur n'a été modifiée pour cette consolidation.

La branche candidate et un déploiement de prévisualisation éventuel ne doivent pas être présentés comme une livraison de production. `main` doit rester inchangée. Le contrôle quotidien est déjà actif ; aucun doublon n'a été créé.
