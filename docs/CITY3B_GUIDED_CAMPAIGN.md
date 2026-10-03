# Ma Ville 3B — campagne guidée

La construction libre reste accessible dès la fondation de la ville. Le guide propose 24 missions principales et 8 demandes facultatives réparties en 8 chapitres : fondation, vie de quartier, mobilité, services publics, culture et préparation d’un rendez-vous, développement, besoins des habitants, huit quartiers.

Les demandes des habitants sont des dialogues écrits dans le guide. Elles portent sur les constructions réelles de la ville. Ce changement ne crée pas une simulation autonome de PNJ ni une fête en temps réel. L’estimation des habitants et de leur satisfaction reste la simulation existante du plan.

## Jouer et reprendre

- L’écran Carte montre la prochaine demande et la progression des 24 missions. L’onglet Missions détaille les 8 chapitres, les objectifs enregistrés et les récompenses.
- Les boutons d’action ouvrent le bâtiment concerné dans le constructeur, le tracé routier, les quartiers, la collection ou les paramètres.
- Les trois missions principales d’un chapitre se réalisent dans l’ordre souhaité. Recevoir leurs récompenses ouvre le chapitre suivant. Les constructions des futurs chapitres restent possibles.
- Les visites, objets exposés et réglages publics sont facultatifs. Aucun achat Premium, succès du Monde ou objet d’inventaire n’est requis pour terminer les 24 missions.
- Une mission déjà récompensée reste accomplie après rangement ou réorganisation. Les objectifs non récompensés sont recalculés sur l’état sauvegardé actuel.

Huit bâtiments abordables complètent le catalogue : école (220 Coins), clinique (280), eau (160), solaire (180), arrêt de bus (180), café (200), atelier culturel (240), bibliothèque (260). Les services contribuent à l’estimation urbaine selon leur rôle ; leur placement compte pour les missions et l’XP de construction.

## Autorité et économie

Le catalogue SQL fixe tous les objectifs et montants. Le client ne transmet qu’un code de mission. L’endpoint city-3b prend l’identité depuis la session authentifiée et contrôle que l’appareil n’a pas été révoqué via `loyalty_session_valid`. Une nouvelle récompense requiert encore un Passeport actif, vérifié sous le verrou du profil dans la transaction. Les trois RPC de campagne sont réservées à service_role ; les utilisateurs ne peuvent pas écrire directement les récompenses.

Une récompense verrouille la ville, vérifie les chapitres et les compteurs réels, écrit un ledger unique par compte et mission, crédite les Coins puis conserve l’XP ville, dans une transaction. Un rejeu rend le résultat enregistré sans crédit supplémentaire. Une erreur du wallet annule toute la transaction.

Les routes courtes, invalides ou répétées dans le sens inverse ne multiplient pas les compteurs. Les bâtiments rangés ne comptent pas. Les visiteurs correspondent aux membres distincts enregistrés, en excluant le propriétaire. Les changements d’ambiance sont journalisés uniquement lorsqu’un réglage change réellement.

L’XP ville = constructions placées × 250 + axes distincts × 120 + objets exposés × 120 + visites (plafond 5 000) + XP des missions reçues. Elle conserve les seuils de niveau et de quartiers existants. Les récompenses ne donnent pas d’XP globale ni de progression au Monde du 3B.

## Déploiement et vérification

Appliquer `20261003003042_city3b_guided_campaign.sql` après les migrations existantes puis déployer `supabase/functions/city-3b`. Le frontend seul ne peut pas accorder de récompense. Si la migration est absente, le guide affiche son indisponibilité et la construction existante reste accessible.

Les tests Node/PGlite exécutent les migrations de ville et la campagne : parcours complet des 24 missions depuis les 500 Coins initiaux, absence de blocage par missions facultatives, droits et isolation des comptes, objectifs réels, crédits uniques, annulation transactionnelle, reprise après rangement et conservation de l’XP ville. Les tests d’endpoint exécutent le gestionnaire de requêtes avec un transport isolé pour vérifier l’identité serveur, les montants ignorés et les routes invalides.

Ces vérifications locales ne constituent pas une vérification d’application des migrations sur la production ni une validation visuelle de la ville sur un appareil physique.
