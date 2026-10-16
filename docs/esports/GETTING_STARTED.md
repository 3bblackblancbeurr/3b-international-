# 16_18 ESPORT — Guide de lancement et de vérification
État du 16 octobre 2026. PR #557 : version de développement, non publiée.

## Documents de l'association
- Dénomination : 16_18 ESPORT. RNA : W744007777.
- Le courriel officiel Service-Public du 13/10/2026 confirme la télé-déclaration A-6-LNYRTTE4PB. Son texte précise que le récépissé est disponible dans le porte-documents de Votre Compte Association.
- Aller sur https://www.service-public.gouv.fr/, se connecter avec le compte ayant enregistré l'association, retrouver la démarche A-6-LNYRTTE4PB, puis télécharger le récépissé et conserver les statuts dans le dossier administratif privé.
- Rechercher le RNA sur https://www.journal-officiel.gouv.fr/pages/associations-recherche/ ; récupérer le témoin de publication JOAFE lorsqu'il sera publié.
- Mettre de côté les statuts, le bureau, les éventuels procès-verbaux et coordonnées institutionnelles. Le SIRET n'est nécessaire que selon l'activité (notamment subventions ou salariés), pas systématiquement pour un tournoi amateur.
- Les pièces ne doivent jamais apparaître dans la galerie vidéo ou le profil public 3B.

## Construire les effectifs vérifiés
Le club peut réunir beaucoup de disciplines, mais une inscription officielle se fait par jeu et par événement.
Pseudos connus : Zakaria 16‑18 (capitaine et direction), DZ Vatos, Dazak, Paolo et Yahia (groupe Warzone). Ces pseudos NE constituent pas une vérification de leurs comptes.
Pour chaque joueur, le manager vérifie en privé et avec son accord : pseudo exact, discipline, plateforme, rôle, URL de compte public FACEIT/éditeur le cas échéant, disponibilité, règle d'âge du tournoi concerné, région de résidence admissible, activation 2FA, anti-triche, accord de publication des images et consentement adapté aux mineurs.
Ne jamais collecter mot de passe, code 2FA, pièce d'identité, numéro de document ou date de naissance dans un formulaire public.
Conserver des statuts simples : « pseudo communiqué », « compte confirmé par l'intéressé », « éligibilité revue pour l'événement », « inscrit », « résultat ». Ne pas inventer les étapes.

## Les compétitions et les premières opportunités
- CoD Challengers : Cup du 14/11/2026 annoncée ; vérifier région EMEA, règlements et comptes FACEIT sur https://www.callofdutyleague.com/en-us/challengers/how-to-compete . Les Minors CDL avec places amateurs nord-américaines ne constituent pas une qualification française automatique.
- Rocket League : des qualifications OPEN en ligne en novembre 2026 attribueront quatre places supplémentaires au RLCS Club Championship. Aucune date exacte d'inscription ni droit acquis n'est confirmé : https://www.rocketleague.com/news/rlcs-returns-to-london-this-december-for-the-club-championship-with-dollar25m-up-for-grabs
- Warzone : surveiller https://callofduty.worldseriesofwarzone.com/resurgence . L'édition 2027 et les inscriptions Warzone ne sont pas confirmées.
- Fortnite : consulter https://www.fortnite.com/competitive et les tournois en jeu ; règlement, âge, région, niveau et A2F propres à la compétition.
- Autres jeux : FACEIT https://www.faceit.com/fr et start.gg https://www.start.gg/ ; consulter aussi les circuits propres à Valorant, CS2, League of Legends, EA SPORTS FC, Rainbow Six, Apex, Overwatch et FGC.

### Déclencheur d'une vraie inscription
Vérifier sur le portail officiel du jeu : inscription ouverte au public et région autorisée France/Europe/EMEA, format, plafond de joueurs, âge, coûts éventuels, interdictions, pseudonymes et preuves. Le capitaine sélectionne une formation et chaque joueur accomplit sa vérification personnelle ; ensuite uniquement, inscription sur le site organisateur.

## Rubriques intégrées dans la PR #557
- Accueil visuel original 16—18, optimisé téléphone.
- Nos équipes : section Warzone + 14 disciplines, toutes non-actives marquées « à constituer ».
- Compétitions : dates annoncées, recherche par texte et jeu, lien organisateur, export .ics calendrier.
- Recherche de joueurs : jeu, rôle, plateforme, disponibilité, consentement, candidature privée.
- 16‑18 TV : liens YouTube/Twitch/TikTok, clips courts MP4/WebM, modération avant diffusion.
- L'association : RNA et formalités, sans données sensibles.
- Bureau privé : modération et suivi des candidatures accessibles au seul staff enregistré.

## Conditions avant publication
Le script docs/esports/secure-setup.sql est une PROPOSITION additive, non appliquée à Supabase. La partie privée reste désactivée jusqu'à validation de RLS, attribution sécurisée du rôle du bureau, tests de candidats et de vidéos, contrôle quotas, QA mobile et tests CI.
Ne jamais créer le rôle de président d'après le pseudo, l'adresse fournie au navigateur ou des JWT user_metadata. Vérifier en serveur un vrai identifiant auth.users.id et n'activer que le bon compte.
Maintenir la cohérence des 217 migrations Supabase enregistrées et ne pas rejouer d'anciennes migrations. Ne pas fusionner l'autre PR brouillon #533 sans vérification des doublons.
La publication nécessite décision de fusion de PR, feu vert sécurité, tests réels et déploiement Vercel. Aucune inscription, licence éditeur ni partenariat n'a été obtenue par cette PR.

## Règles associatives conseillées
Charte anti-triche et anti-harcèlement, respect des personnes, vérification des disponibilités, autorisations vidéo et droit de retrait, prévention des abus, confidentialité, transparence des décisions, compte-rendus du bureau et procédures propres à chaque tournoi.
