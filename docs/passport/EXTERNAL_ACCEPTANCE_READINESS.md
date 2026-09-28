# Passeport 3B — Dossier de préparation aux acceptations externes

Date : 28 septembre 2026  
Statut : document de préparation interne — aucune certification ou reconnaissance officielle revendiquée.

## Objectif

Préparer 3B pour l’intégration avec un prestataire sérieux de vérification d’identité et, plus tard, des services partenaires qui accepteront le Passeport 3B comme identité numérique privée.

## 1. Ce qui doit être vrai avant de contacter un prestataire d’identité

- un domaine de production durable ;
- mentions légales et responsable de traitement identifiés ;
- politique de confidentialité à jour ;
- registre RGPD de travail ;
- parcours d’inscription documenté ;
- séparation identité publique / identité civile privée ;
- consentement identité versionné ;
- données civiles accessibles uniquement au serveur ;
- aucune identité marquée « vérifiée » depuis une saisie utilisateur ;
- aucun scan de document, selfie ou biométrie stocké par défaut chez 3B ;
- journalisation de sécurité ;
- limitation de tentatives et anti-robot ;
- suppression de compte ;
- procédure de support et contestation à définir.

## 2. Exigences pour le futur prestataire

Le prestataire candidat doit fournir des réponses vérifiables sur :

- documents d’identité supportés ;
- détection documentaire ;
- contrôle de présence / liveness lorsqu’il est utilisé ;
- comparaison personne-document ;
- lecture NFC lorsque disponible ;
- niveau de garantie proposé ;
- statut PVID/certification applicable et dates de validité ;
- hébergement et localisation des données ;
- sous-traitants ;
- transferts hors EEE ;
- chiffrement et gestion des clés ;
- rétention des documents/selfies ;
- suppression ;
- signature des webhooks ;
- idempotence ;
- sandbox ;
- SLA et incidents ;
- revue manuelle et appel en cas de rejet ;
- prise en charge des mineurs ;
- prévention des doublons ;
- export des preuves/audits sans exposition inutile de données personnelles.

## 3. Règles d’intégration 3B

Le fournisseur ne pourra jamais appeler directement une API cliente pour rendre une identité « verified ».

Le flux cible est :

1. utilisateur authentifié ;
2. consentement explicite ;
3. création serveur d’une tentative de vérification ;
4. session fournisseur créée côté serveur ;
5. utilisateur effectue le contrôle chez le fournisseur ;
6. webhook fournisseur reçu côté serveur ;
7. signature du webhook vérifiée ;
8. contrôle de l’idempotence ;
9. référence fournisseur hachée ;
10. résultat appliqué côté serveur ;
11. journal de sécurité créé ;
12. profil Passeport mis à jour ;
13. interface utilisateur rafraîchie.

## 4. Données à ne pas stocker chez 3B par défaut

- empreintes digitales ;
- modèle Face ID ;
- gabarits biométriques ;
- clé privée Passkey ;
- selfie brut ;
- vidéo de liveness brute ;
- scan brut de CNI/passeport ;
- numéro complet de document lorsque non nécessaire ;
- payload webhook intégral contenant des données sensibles.

## 5. États attendus

Compte :
- created
- email_pending
- account_verified
- suspended

Passeport :
- active
- suspended
- revoked
- expired

Identité :
- unverified
- pending
- verified
- rejected
- expired
- revoked

## 6. Critères de sortie avant activation réelle

Aucun fournisseur d’identité réel n’est activé avant :

- contrat signé ;
- DPA / clauses de sous-traitance revues ;
- politique de confidentialité finale ;
- base légale confirmée ;
- politique mineurs confirmée ;
- durées de conservation définies ;
- secrets production installés côté serveur ;
- webhook signé vérifié ;
- tests sandbox réussis ;
- tests anti-rejeu réussis ;
- tests doublons réussis ;
- test suppression/révocation réussi ;
- test perte de téléphone/récupération réussi ;
- test mobile Android et iOS réussi ;
- revue de sécurité indépendante recommandée.

## 7. Passkeys

La Passkey sert à prouver le contrôle du compte/Passeport, pas l’identité civile.

Avant activation :
- domaine RP définitif ;
- origines autorisées ;
- récupération testée ;
- révocation appareil perdue ;
- deuxième moyen d’accès ;
- tests Android/iOS/web.

Les biométries restent dans le téléphone ou l’authenticator.

## 8. Futurs partenaires — « Continuer avec Passeport 3B »

Chaque partenaire doit avoir :
- un client enregistré ;
- des redirect URI exactes ;
- Authorization Code + PKCE ;
- state + nonce ;
- scopes minimaux ;
- consentement visible ;
- révocation ;
- identifiant pseudonyme/pairwise quand approprié ;
- aucune transmission de Coins, inventaire, adresse ou identité civile sans besoin et consentement.

## 9. Niveaux de confiance 3B proposés

- self_asserted : informations déclarées uniquement ;
- account_verified : canal d’authentification confirmé ;
- identity_verified : contrôle d’identité externe accepté ;
- high_assurance : niveau renforcé lorsque réellement fourni et contractuellement justifié.

Aucun label supérieur ne doit être affiché avant que la preuve correspondante existe.

## 10. Dossier à remettre à un prestataire / partenaire

- présentation de 3B International ;
- finalité du Passeport 3B ;
- diagramme de flux d’identité ;
- politique de confidentialité ;
- registre RGPD pertinent ;
- architecture de sécurité ;
- liste des données demandées ;
- matrice de conservation ;
- procédure incident ;
- procédure suppression ;
- procédure révocation ;
- politique mineurs ;
- contacts sécurité / vie privée ;
- environnements sandbox et production ;
- résultats de tests de sécurité.

## Références de cadrage

Pour la France, vérifier au moment de la contractualisation la liste et le statut actuels des prestataires PVID publiée par l’ANSSI ainsi que le référentiel PVID en vigueur. La présence d’un prestataire sur une liste ou l’obtention d’un niveau de garantie par celui-ci ne signifie pas que 3B est lui-même certifié ou qualifié.


## 11. Contrôle automatique dans le dépôt

Le dépôt fournit désormais :

- `npm run passport:readiness` : vérifie les fondations techniques et documentaires pouvant être contrôlées sans fournisseur externe ;
- `npm run passport:activation-check` : mode fail-closed destiné au jour où un prestataire est réellement sélectionné et configuré ;
- workflow CI `Verify Passport Identity Acceptance` : empêche une régression silencieuse de la frontière de confiance.

Le mode `activation-check` doit échouer tant que les secrets fournisseur, la signature webhook et l'anti-bot production ne sont pas réellement configurés. Un échec dans ce mode avant contractualisation est donc attendu et souhaité.

## 12. Référence PVID à revérifier avant contrat

Au 28 septembre 2026, le site de l'ANSSI publie le référentiel PVID v1.1 et distingue les niveaux de garantie `substantiel` et `élevé`.

Avant toute signature, vérifier directement sur le site de l'ANSSI :

- que le **service exact** du prestataire est toujours certifié ou dans le statut revendiqué ;
- le niveau de garantie ;
- le périmètre exact ;
- les dates de validité ;
- la décision de certification applicable.

Ne jamais déduire qu'un prestataire, sa société entière ou 3B est certifié simplement parce qu'un de ses services a obtenu une certification.


## 13. État de sécurité Auth vérifié le 28 septembre 2026

Contrôle direct du projet Supabase :

- les tables privées `member_identity_claims`, `passport_identity_verification_attempts` et `passport_partner_consents` ont RLS activée ;
- les rôles `anon` et `authenticated` n'ont pas de droits directs sur ces tables ; le service serveur reste l'autorité ;
- `allow_legacy_flows=false` en production ;
- aucun profil existant n'est actuellement marqué identité civile `verified` sans preuve externe ;
- la base rejette désormais les dates de naissance futures.

Point restant avant activation d'un fournisseur d'identité :

- activer et vérifier dans Supabase Auth la protection contre les mots de passe compromis (Leaked Password Protection). Le Security Advisor la signale actuellement désactivée.

Le mode `passport:activation-check` exige désormais une attestation explicite que ce réglage ainsi que les validations juridique, conservation, mineurs et sandbox E2E ont réellement été terminés. Ces drapeaux ne constituent pas une certification : ils empêchent seulement une activation accidentelle incomplète.
