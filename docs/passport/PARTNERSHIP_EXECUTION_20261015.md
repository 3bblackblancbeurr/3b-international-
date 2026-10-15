# Passeport 3B : reconnaissance utile et vérifiable

État vérifié le 15 octobre 2026. Document de préparation, pas un contrat, une habilitation ou une certification. Les dates de certification ci-dessous doivent être recontrôlées au moment du contrat.

## Décision proposée

Commencer par un pilote limité avec un partenaire qui accepte le statut de membre 3B pour un avantage précis. N'exiger une identité civile que si la finalité le justifie. Maintenir un seul Passeport ; distinguer compte confirmé, identité vérifiée et acceptation par un partenaire.

Les indicateurs d'exploitation et les résultats de configuration propres à l'environnement sont conservés dans le dossier de travail du propriétaire. Cette documentation publique décrit les étapes et critères d'acceptation ; elle ne prouve pas une reconnaissance déjà acquise.

## Parcours en quatre étapes

| Étape | Livrable concret | Preuve de sortie | État |
| --- | --- | --- | --- |
| Pilote membre | Un commerce, une association ou un organisateur d'événement ; un avantage défini ; preuve `passport.basic` | Accord écrit, intégration testée, registre activé, consentement et révocation démontrés | Partenaire à obtenir |
| Identité externe | Parcours exact du prestataire choisi, contrat et règles de conservation | Sandbox réussie, service certifié dans son périmètre, configuration production approuvée | Adaptateur IDnow préparé, contrôle réel non activé |
| Interopérabilité | Une intégration standard réellement testée | Rapport de conformité/interopérabilité, métadonnées, clés, flux de récupération | Objectif ; la preuve privée 3B actuelle n'est pas un service OpenID Connect ou EUDI |
| Écosystème européen | 3B demandeur de preuves, selon le besoin et l'éligibilité | Enregistrement national requis, validation de confiance et tests avec portefeuilles | Démarche à préparer, aucune reconnaissance acquise |

## Présélection vérifiée de services PVID

Le catalogue ANSSI accessible depuis la page officielle, page imprimée 53 (index PDF 52), indique les services suivants. Toutes les lignes ci-dessous portent le niveau **substantiel**. Le catalogue distingue les services certifiés de ceux seulement en cours de certification.

| Service exact | Fin de validité indiquée | Décision | Usage de cette information |
| --- | --- | --- | --- |
| IDnow - IDCheck.io Identity Proofing Service | 24/07/2027 | 1953 | Premier candidat : adaptateur existant à confronter au parcours réellement certifié |
| Docaposte - PVID Docaposte | 15/07/2028 | 3260 | Alternative à consulter, conditions commerciales inconnues |
| NJF Vision - Checkout IDV (ex Ubble), Service Expert | 31/03/2027 | 1106 | Alternative, renouvellement à vérifier avant engagement |
| Namirial - Namirial Onboarding ID Self Max | 02/07/2028 | 3132 | Alternative, intégration à chiffrer |

La certification de ces services ne certifie ni 3B ni tous les produits du fournisseur. Un résultat du bac à sable ne devient jamais une identité civile vérifiée en production. Aucun tarif ni SLA n'est présumé.

## Brief de consultation prêt à utiliser

Objet : étude d'un pilote de vérification d'identité pour Passeport 3B.

3B développe une identité communautaire privée associée à une application et à des services partenaires. Nous souhaitons évaluer un pilote limité, sans engagement de volume à ce stade. Merci de préciser :

1. Le service, sa version, son OID, la décision ANSSI, sa validité et le parcours exact couvert.
2. Le coût unitaire, les frais de démarrage, minimums, engagements, devis de sandbox et conditions de sortie.
3. Les pays/documents acceptés, accessibilité mobile, mineurs et solution de recours humain.
4. La localisation, les sous-traitants, transferts, durées de conservation et suppression des pièces et selfies.
5. La signature des notifications, idempotence, reprises, expiration, révocation et tests d'intégration.
6. Le mécanisme proposé contre les doublons, sa portée réelle, ses erreurs possibles et sa procédure de contestation.
7. Les justificatifs d'audit disponibles et les obligations contractuelles de 3B.

Ce texte est préparé mais non envoyé. Aucun document d'identité ni donnée de membre ne doit être joint au premier contact.

## Fiche pilote partenaire

À compléter avec un partenaire volontaire avant activation :

- **Finalité** : accès à un événement ou avantage membre précisément décrit ; pas de contrôle civil par défaut.
- **Données** : identifiant pseudonyme propre au partenaire, statut actif, durée ; autres attributs seulement si nécessaires.
- **Flux** : demande du partenaire, consentement du titulaire, preuve courte liée à la demande, contrôle serveur, consommation unique.
- **Limite** : la preuve de membre ne garantit pas à elle seule qu'une personne civile n'a jamais créé un second compte.
- **Accord** : parties et signataires, avantage, durée du pilote, responsabilités, support, conservation, sortie et droit d'utiliser les logos.
- **Indicateurs proposés** : taux de réussite, délai de présentation, erreurs et réclamations ; aucune pièce civile dans les mesures.
- **Recette** : bonne audience acceptée ; autre partenaire, preuve expirée, replay, consentement retiré, compte suspendu et droit révoqué refusés.
- **Révocation** : partenaire désactivable, preuve révoquable, téléphone perdu et récupération traités ; aucun mode hors ligne présenté comme preuve à jour.

Le statut « partenaire accepté » ne doit être affiché qu'après accord et recette. Ne pas inscrire des entreprises dans le registre pour simuler de la reconnaissance.

## FranceConnect, EUDI et protection des données

FranceConnect/FranceConnect+ n'est pas un label général pour une application. La documentation officielle prévoit des conditions particulières pour les sociétés et associations : services de changement d'adresse concernés ou obligation réglementaire applicable à leur propre service de vérifier l'identité. Le simple projet de jeu, fidélité ou communauté ne démontre pas cette éligibilité. Une éventuelle demande exige ensuite habilitation, intégration, qualification et clés de production.

Pour EUDI, la trajectoire à étudier est d'abord celle d'un service demandeur de preuves. La Commission indique un enregistrement dans l'État membre d'établissement, une déclaration des attributs demandés et la validation des preuves et de la confiance. Le présent dépôt ne démontre pas ces étapes. Émettre un justificatif d'adhésion et devenir un portefeuille certifié sont des projets distincts.

La CNIL rappelle la minimisation : ne demander que les données nécessaires à une finalité. La biométrie exige une analyse et une base juridique appropriées. Le projet doit définir responsable de traitement, sous-traitants, conservation, recours, droits des personnes et nécessité éventuelle d'une AIPD avant activation. Aucune formule « conforme RGPD à 100 % » ne remplace cette analyse.

## Portes techniques avant ouverture

1. Corriger et tester les limites HTTP et transitions atomiques du parcours d'identité ; migrer la base avant les nouvelles fonctions.
2. Activer et vérifier la protection des mots de passe compromis lorsque le plan Supabase le permet (fonctionnalité Pro ou supérieur dans la documentation consultée). Aucun achat de plan effectué.
3. Tester récupération, sessions révoquées, expiration, anti-rejeu et consentements sur Android et iOS réels.
4. Vérifier domaine, politique de confidentialité, contrats, clés et rotation ; conserver les justificatifs d'approbation.
5. Réaliser une revue externe du périmètre à ouvrir. Ne jamais transformer une vérification statique de fichiers en certification.

## Sources officielles consultées le 15 octobre 2026

- ANSSI, catalogue en vigueur : https://messervices.cyber.gouv.fr/visas/catalogue-produits-services-profils-de-protection-sites-certifies-qualifies-agrees-anssi.pdf
- ANSSI, référentiels : https://cyber.gouv.fr/offre-de-service/solutions-certifiees-et-qualifiees/comprendre-levaluation-de-securite/qualification-de-produit-et-services/referentiels-qualification/
- FranceConnect, éligibilité : https://docs.partenaires.franceconnect.gouv.fr/fs/devenir-fs/pilotage-eligibilite/
- FranceConnect, étapes : https://docs.partenaires.franceconnect.gouv.fr/fs/devenir-fs/pilotage-etapes/
- Commission européenne, services EUDI : https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/881984674/Wallet+for+service+providers
- CNIL, minimisation : https://www.cnil.fr/fr/definition/minimisation
- CNIL, biométrie : https://www.cnil.fr/fr/biometrie
- Supabase, mots de passe : https://supabase.com/docs/guides/auth/password-security
