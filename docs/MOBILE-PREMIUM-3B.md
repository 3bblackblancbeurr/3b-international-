# Révision mobile et parcours simples — 11 septembre 2026

Les entrées du menu principal, du menu de navigation, des jeux, de l’espace IA, du réseau communautaire, du guide et de la collection utilisent le composant CompactCard. Il reprend le fond bleu nuit, le filet or et les angles de 8 px de « La course des clés ». Une seule colonne sur téléphone ; le guide XP termine le menu. Les cartes numériques de fidélité conservent les cinq illustrations existantes et ajoutent Bâtisseur (30 000 XP, cuivre), Visionnaire (60 000 XP, platine) et Éternel (100 000 XP, nacre). Les huit dessins sont distincts ; le plafond de réduction boutique reste de 10 %. Les paliers et avantages des cinq premières cartes sont conservés.

L’atelier suit trois étapes : Pièce, Style, Finaliser. Il contient 69 pièces de départ, 53 choix de matières et 30 techniques, avec des champs libres et huit techniques maximum par concept. Les silhouettes distinguent pantalons, jupes, robes, tenues, manteaux, sacs, accessoires et chaussures. L’aperçu reste un schéma : un atelier doit valider patronage, compatibilités, tailles et coûts. Un ancien concept sauvegardé reste lisible. Sauvegarde locale, export du brief et préparation d’une publication sont disponibles sans génération IA.

Mode 3 IA présente un seul champ de conversation. Aucun fournisseur n’est choisi par l’utilisateur : le serveur consulte les services configurés puis prépare une synthèse. Les indisponibilités partielles et l’échec d’une synthèse sont indiqués. Les rôles et la taille de l’historique sont vérifiés ; les quotas existants restent actifs. La dictée démarre uniquement à l’action de l’utilisateur, selon le navigateur ; celui-ci peut transmettre l’audio à son service de reconnaissance.

La communauté donne trois entrées : salon, idées et créations, membres et créateurs. Le parcours d’inscription préserve l’affichage de la clé de secours avant le retour au collectif. L’accès au salon exige une session active, un profil activé et la charte version 2026-09-v1 acceptée. Cette règle existe aussi dans les politiques SQL de lecture, pas seulement dans l’interface. Le blocage bilatéral, les signalements, le retrait des contenus et les limites de fréquence sont conservés. La lecture ne défile pas automatiquement si le membre relit des messages plus anciens. Il n’y a pas de vérification d’identité ou d’adresse e-mail.

Le portrait du passeport effectue des mouvements progressifs avec pauses, rotation bornée et cou stabilisé ; les yeux clignent à intervalles irréguliers avec parfois un double clignement. L’animation respecte les réglages de mouvement et s’arrête hors écran.

## Validation

- Compilation de production et 105 tests JavaScript réussis, dont validation des créations, silhouettes, mouvements du portrait et orchestration des IA.
- Migration additive community-enrollment.sql appliquée et fonction ecosystem v4 déployée. Le service member-hub est mis à jour avec le même shared/loyalty.js, envoyé sous le nom loyalty.js lors du déploiement, pour vérifier les trois nouveaux paliers côté serveur.
- community-enrollment-test.sql exécuté dans une transaction annulée : refus avant consentement, refus des écritures directes, lecture après consentement, blocage bilatéral, profil masqué, session révoquée et accès anonyme.
- Vérification visuelle mobile et parcours : menu, jeu lancé directement, création d’une jupe en lin avec plissé, cartes illustrées, absence de sélecteur IA, inscription invitée. Salon et formulaire de signalement testés avec des données isolées dans un serveur local ; aucun message de test publié en production.

## Activation restant à effectuer

Les accès fournisseurs IA restent absents : aucune réponse réelle ni génération d’image ne peut être fournie avant leur configuration. AI_ENABLED reste désactivé. Les adaptateurs et l’interface sont prêts ; aucun abonnement ou compte fournisseur n’a été créé.

La boutique reste sans catalogue et les ventes sont fermées tant que produits, prix, stocks, livraison, coordonnées du vendeur et paiement ne sont pas configurés. Aucun paiement réel n’a été déclenché.

Le propriétaire doit créer son compte 3B pour qu’il puisse être désigné comme modérateur. Aucun compte arbitraire n’a reçu ce rôle. Les signalements peuvent être enregistrés mais nécessitent ensuite une personne habilitée pour leur traitement. La protection Supabase contre les mots de passe compromis reste à activer dans le tableau de bord.

