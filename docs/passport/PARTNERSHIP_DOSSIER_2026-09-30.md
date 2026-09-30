# Dossier de reconnaissance du Passeport 3B

30 septembre 2026 — dossier de préparation, utilisable pour une revue partenaire. Aucun accord externe, label, habilitation ou certification n’est affirmé.

## Proposition pour un premier partenaire

3B propose un passeport de membre privé pour confirmer l’appartenance active à son application. Un partenaire autorisé peut, avec un accord explicite et une confirmation par clé d’accès, obtenir une preuve en ligne minimale liée à une transaction unique. Si un flux IDnow qualifié est effectivement ouvert et a produit une preuve live récente, un signal séparé de vérification d’identité peut être demandé. Le profil public, les distinctions du fondateur et les éléments de progression ne sont pas des preuves civiles.

Le pilote est codé mais reste fermé par défaut et non déployé à la date de ce dossier. Le candidat reçoit un identifiant distinct, une audience fixe, un secret de serveur, des scopes minimaux et une finalité approuvée. Les données civiles ne sont pas exportées. L’intégration et les limites techniques figurent dans [le protocole d’activation](PILOT_ACTIVATION_2026-09-30.md) et [le dossier de sécurité](PARTNER_PILOT_SECURITY_2026-09-30.md).

### Fiche à compléter avant l’ouverture d’un partenaire

| Élément | Réponse attendue |
|---|---|
| Identité juridique, responsable et contact sécurité | Dénomination, registre et responsable désigné |
| Service et action à protéger | Cas concret ; pas une collecte générale de profil |
| Audience | Une URL HTTPS fixe de serveur, sans paramètre ou fragment |
| Données indispensables | `passport.basic` ; `identity.verified` uniquement si justifié |
| Finalité affichée au membre | Texte compréhensible et validé par les deux responsables |
| Base juridique, rôles et exercice des droits | À établir avec les responsables du traitement |
| Rétention et suppression | Durées précises pour preuve, logs et correspondance locale |
| Révocation et renouvellement | Preuve par opération ; aucun accès permanent déduit du pilote |
| Gestion des secrets | Coffre de serveur, rotation, arrêt immédiat en cas d’incident |
| Support et contestation | Canal d’aide et procédure documentée |
| Recette et responsabilités | Tests négatifs, appareils réels et preuve de validation |
| Acceptation signée | Autorisation de mise en service, limites et périmètre exact |

Le contrat du pilote doit interdire le passage du secret partenaire au navigateur, la réutilisation d’une preuve pour une autre action, l’inclusion de données personnelles dans une nonce et la présentation du Passeport comme pièce d’identité officielle. Il doit rappeler qu’une information déjà reçue n’est pas effaçable par une simple révocation 3B.

## Trajectoires de reconnaissance réalistes

| Voie | Ce que cela apporterait | État vérifiable et étape nécessaire |
|---|---|---|
| Accord bilatéral avec un partenaire | Acceptation du Passeport pour un usage défini | Code du pilote disponible ; partenaire, contrat, recette et activation encore nécessaires |
| Prestataire IDnow | Vérification civile dans un flux contractuellement défini | Intégration fermée avec contrôles live ; credentials, flux, preuves de qualification et SLA à confirmer |
| WebAuthn/passkeys | Confirmation de possession d’une clé sur un domaine | Implémentation et tests cryptographiques ; recette sur appareils et audit requis pour ouvrir |
| OIDC / OpenID4VP / OpenID4VCI | Interopérabilité protocolaire avec des vérificateurs/wallets | À implémenter et tester ; le pilote JSON actuel ne constitue pas cette interopérabilité |
| FranceConnect / FranceConnect+ | Accès comme fournisseur de service habilité, si éligible | Aucun dossier validé ; justification juridique d’éligibilité avant toute demande technique |
| EUDI | Accepter une attestation d’un wallet reconnu, ou participer dans un rôle autorisé | Rôle, registre de confiance, profils, conformité et conditions applicables à définir |

### IDnow

Le contrat doit identifier exactement le produit, le flux, la version et les environnements. Vérifier la portée d’une éventuelle qualification du prestataire, sa validité et le contrôle personne/document réalisé par ce flux ; l’acceptation technique d’une session ne certifie pas 3B. L’ouverture production exige l’approbation réelle du flux, ses credentials et une recette signée. Le seul nom d’un prestataire ou un flag de configuration ne prouvent ni un niveau réglementaire de garantie ni une certification de l’application. Le code n’attribue pas d’âge vérifié depuis une saisie du membre. [Interface officielle des résultats IDnow](https://docs.eu.platform.idnow.io/docs/integration/get-session-results/).

### FranceConnect

La documentation actuelle impose, aux organismes privés, une obligation législative ou réglementaire de vérifier les utilisateurs de leurs propres services. La seule volonté de sécuriser une communauté ou l’obligation d’un client ne suffit pas. L’éligibilité de 3B n’est donc pas établie dans ce dossier. L’habilitation, l’accès au bac à sable, la qualification et l’ouverture production suivent ensuite le parcours DINUM ; responsable de traitement, DPO, responsable technique et RSSI doivent être identifiés. [Conditions d’éligibilité](https://docs.partenaires.franceconnect.gouv.fr/fs/devenir-fs/pilotage-eligibilite/), [parcours fournisseur de service](https://docs.partenaires.franceconnect.gouv.fr/fs/devenir-fs/).

### EUDI et standards ouverts

Le cadre EUDI distingue des rôles, une infrastructure de confiance et des exigences de conformité. Une option raisonnable à évaluer pour 3B serait le rôle de service qui vérifie une attestation d’un wallet reconnu, plutôt qu’affirmer que le Passeport de membre est une identité officielle. C’est une orientation de projet, pas une reconnaissance obtenue. La documentation de la Commission fournit les profils, la confiance et les étapes de certification à étudier. [Architecture officielle EUDI](https://eudi.dev/latest/main/).

Le protocole OpenID4VP exige de lier une présentation à son destinataire et à une nonce fraîche. Le pilote reprend ces protections de transaction mais n’implémente pas encore les présentations, credentials, discovery, formats et profils de confiance du protocole. Aucun badge « compatible EUDI », « certifié eIDAS » ou « FranceConnect validé » ne doit être ajouté avant preuve de conformité et autorisation appropriée. [OpenID4VP1.0 final](https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html).

## Dossier de preuve à remettre lors d’une revue

Le dépôt fournit le protocole limité, les frontières de confiance, la minimisation, les migrations PENDING, les fonctions Edge, les tests PostgreSQL et cryptographiques, les règles de révocation et une UI sans accord automatique. Il reste à joindre : identité de l’exploitant, conditions contractuelles, responsabilités de traitement, rétention réelle et suppression, politique de support/contestation, rapport de recette sur staging, audit indépendant et preuves précises de toute qualification annoncée.

Les éléments ouverts doivent conserver la mention « prévu » ou « en qualification ». Une reconnaissance externe naît d’une décision du partenaire ou de l’autorité compétente ; une modification de code seule ne peut pas la produire.
