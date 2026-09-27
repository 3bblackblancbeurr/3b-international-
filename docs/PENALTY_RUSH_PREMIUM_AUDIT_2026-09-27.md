# 3B Penalty Rush — audit et candidat premium, 27 septembre 2026

## Statut
Candidat de travail pour la PR #322, pas une version finale certifiée. Aucun déploiement ni fusion dans main. Base examinée : main e9ac26e3 ; V7 cb9d57b2. La V7 a été intégrée localement sans conflit.

## Défauts trouvés et corrigés
- La profondeur du gardien influençait les tirs dans le client V7 mais pas dans le moteur serveur. Moteurs alignés ; test sur 80 combinaisons de profondeur, geste et cible.
- Quatre attentes V4 étaient obsolètes (filet, profondeur de déplacement, réconciliation, cible caméra). Contrats mis à jour sans retirer les tests.
- Le teint et les cheveux étaient déduits du pays. Choix indépendants et normalisés : sept teints, six couleurs dont blond/roux/gris, cinq coiffures correspondant aux variantes disponibles, rendu procédural mobile et avatars PC.
- Le nom civil alimentait le pseudo par défaut. Le pseudo du compte est désormais privilégié ; aucun email, numéro de document ni champ inconnu n’est recopié dans le profil joueur normalisé. Les anciens noms déjà enregistrés ne sont pas réécrits automatiquement.
- Les pannes du contrôle de session et de limitation de fréquence autorisaient les requêtes. Ces contrôles refusent maintenant l’accès en cas d’indisponibilité, et une session valide ainsi qu’un Passeport actif sont requis côté serveur.
- Le matchmaking classé prenait le premier salon disponible. Fenêtre de différence de niveau de 100 à 400 points, élargie de 50 points toutes les 15 secondes d’attente.
- Les matchs privés/rapides nourrissaient réputation et scouting. Seuls les trois premiers duels classés d’une paire sur 24 heures alimentent désormais la progression compétitive. Les autres résultats restent dans l’historique. Les anciennes statistiques restent conservées : un éventuel recalcul historique demande une migration dédiée.
- Ajout de saisons mensuelles UTC : Elo de saison, dix matchs de placement, divisions Bronze/Argent/Or/Platine/Diamant/Élite. Le niveau permanent reste utilisé pour le matchmaking. Le mois est celui du début du duel.
- Le rang national était tronqué à 5 000 adversaires et ignorait les égalités. Calcul complet en base, classement déterministe, exclusion des joueurs en placement.
- Le statut pouvait annoncer une sélection sans convocation acceptée. La présélection reste une présélection ; décision atomique en base, fenêtre contrôlée, critères sportifs et Passeport actif, douze places par pays et fenêtre.
- Les couleurs choisies à la création du club étaient ignorées. Couleurs conservées ; adhésion atomique et idempotente, limite de trente membres, un seul club par compte.
- Des actions tardives pouvaient arriver après un changement de possession ; ajout du contexte de possession. Les gestes répétés bénéficient de délais serveur.
- L’historique présentait les scores dans l’ordre du salon plutôt que du joueur. Perspective corrigée.
- Studio divisé en cinq rubriques, aperçu des couleurs, navigation accessible au clavier, cibles de couleur de 44 px, prise en compte de la réduction des animations. Identité noir/or/bleu conservée.
- Trois alertes npm modérées provenaient de uuid via xcode/Capacitor. Dépendance transitive corrigée vers uuid 11.1.1 ; lecture du projet Xcode et génération UUID vérifiées.

## Validations
- Suite ciblée Penalty Rush et intégrité des migrations : 59 tests réussis lors du dernier passage ciblé.
- Première vérification globale après corrections : 1 214 tests réussis, compilation web réussie. Vérification finale relancée après les dernières corrections ; consulter son résultat dans le bilan de chat/CI.
- Tests PostgreSQL embarqués : exécution réelle des migrations, règlement exactement une fois, exclusion privé/rapide, limite de rencontres répétées, saisons, convocations refusées pour mauvais compte/critères/Passeport, acceptation idempotente, permissions, adhésion club.
- npm audit : zéro vulnérabilité signalée après correction. Cela ne constitue pas une certification générale de sécurité.
- Synchronisation Capacitor Android et iOS réussie sous Windows. Projet Xcode lu avec la dépendance corrigée.
- Vérification visuelle du composant studio avec un profil fictif local en 1280×720 et 390×844 ; changement de couleurs et navigation testés. Terrain d’entraînement gardien chargé, aucune erreur console observée. Le format étroit conserve un pointeur de bureau : il ne simule pas un vrai écran tactile.
- La route réelle sans compte affiche le contrôle Passeport requis. Les écrans connectés ont donc été inspectés dans une page de test locale ; aucune validation multijoueur authentifiée de bout en bout n’est revendiquée.

## Publication du 27 septembre 2026
Publication autorisée par le propriétaire après les sept workflows réussis sur c73467f65e6462d729738869856d9305a8dddf55. PR #322 fusionnée dans main (e138a18f0cf3cd721434c50256b62ad1616bf046). Déploiement Vercel réussi.

Les trois migrations ont été appliquées au projet de production ttvhcezucsbbmnafrotq sous les versions 20260927003738, 20260927003739 et 20260927003740. Leurs fichiers sont renommés avec ces versions et leurs empreintes transférées de PENDING vers APPLIED ; le contenu SQL et les 152 anciennes entrées restent inchangés.

La fonction penalty-rush v17 est ACTIVE, avec vérification JWT maintenue. Les quatre fichiers déployés correspondent exactement aux sources ; les procédures de règlement, sélection, adhésion et rang sont réservées au rôle serveur. Aucune partie active au moment de la mise à jour.

URL : https://3b-international.vercel.app/jeux/penalty-rush

Les limites fonctionnelles et les essais réels encore nécessaires ci-dessous restent valables. Cette publication ne signifie pas que la refonte complète est terminée.

## Travaux restants avant une version finale
- CI distante et builds Android/iOS réussis sur le commit final. Restent une revue sécurité indépendante et des essais à deux comptes, reconnexion, latence, concurrence et appareil tactile réel.
- Le Passeport 3B actuel est une identité de compte, pas une preuve d’identité civile renforcée. Aucun justificatif, biométrie ou KYC n’a été inventé ou collecté. Une attestation d’identité renforcée et sa révocation doivent être raccordées à un service effectivement disponible avant d’en faire une condition certifiée.
- Les compétitions nationales jouables, calendriers, rencontres collectives de clubs, contrats de recrutement et incrément des sélections internationales ne sont pas entièrement implémentés. Les menus distinguent désormais le programme prévu des fonctions actives.
- La présélection reste recalculée lors de la consultation du profil ; un traitement planifié équitable de tous les candidats et une procédure de recours restent à définir.
- Le contrôle d’un seul salon actif par utilisateur repose encore sur des vérifications applicatives ; il faut un verrou transactionnel pour les créations simultanées. Les salons dépendent encore des requêtes clients pour avancer : tester et renforcer le nettoyage des déconnexions.
- L’anti-abus ne prouve pas l’unicité d’une personne derrière plusieurs comptes ; la correction du classement ne suffit pas à certifier l’absence de collusion.
- Les statistiques historiques préexistantes incluent encore des parties amicales. Ne pas présenter le scouting historique comme intégralement assaini sans recalcul validé.

## Recherche produit : sources primaires
- EA SPORTS FC 26, Clubs (31 juillet 2025) : archétypes, carte de joueur, progression expliquée et personnalisation. Principes retenus : choix de style lisibles, séparation visuelle des rubriques et progression compréhensible. Aucun achat de puissance ajouté. https://www.ea.com/fr/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-clubs-deep-dive
- Konami, eFootball v5.50 : matchmaking plus souvent à niveau comparable et progression entre phases. Principe retenu : rapprocher les niveaux et expliquer les saisons ; ce n’est pas une reproduction de leur algorithme. https://www.konami.com/efootball/en/page/v5/versioninfo_v5-50

Ce bilan distingue volontairement ce qui est implémenté et testé de ce qui reste nécessaire. Les travaux restants ne sont pas couverts par cette publication.

## Correctif constaté lors du contrôle en production
La première inscription échouait car le schéma de production exige passport_public_id. Le serveur lit désormais cet identifiant depuis le Passeport actif du compte et le lie au nouveau profil, sans le publier dans le profil sportif. Deux tests exécutent la création avec un Passeport valide et le refus avant écriture en cas de Passeport absent ou révoqué. Le navigateur connecté affiche désormais ONLINE et le studio se charge sans cette erreur. Aucun duel à deux comptes ni essai sur appareil tactile réel n'est revendiqué.
