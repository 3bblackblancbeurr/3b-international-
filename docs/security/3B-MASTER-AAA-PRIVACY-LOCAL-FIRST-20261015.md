# 3B INTERNATIONAL — SÉCURITÉ MASTER AAA · LOCAL FIRST
**Audit technique et registre de décisions — 15 octobre 2026**

> **Ce document décrit des mesures techniques, pas une certification, un agrément HDS ni la preuve d'une absence totale de risque.** Il ne contient aucune donnée d'un membre réel ni secret serveur. Ne jamais recopier dans ce dépôt public des logs d'authentification, adresses IP, noms civils ou pièces d'identité.

## Vision : identité et santé sous contrôle de la personne

Principe à appliquer à toute nouvelle fonctionnalité : **ne collecter que le nécessaire, garder les informations privées sur l'appareil si possible, chiffrer avant tout transfert facultatif et séparer les clés de leurs copies.**

- **Profil public :** pseudonyme, avatar public volontaire, pays 3B, progression publique choisie. Pas de nom civil par défaut.
- **Compte :** e-mail d'authentification et métadonnées minimales ; seuls les services d'authentification autorisés peuvent les traiter. Pas d'e-mail dans la télémétrie.
- **Passeport :** identité civile dans des tables de service uniquement, autorisations par besoin de connaître. Vérification d'identité via un prestataire agréé/approprié uniquement lorsque les contrats, décisions et validations réglementaires sont réunis ; 3B garde des attestations minimales, pas les scans/biométries.
- **Santé (bien-être général) :** mode temporaire par défaut, coffre de sauvegarde local chiffré et facultatif. Ne jamais synchroniser sans demande expresse du membre.
- **Transactions :** le prestataire de paiement détient les données carte ; 3B conserve le minimum légal nécessaire aux commandes.
- **Partenaires :** partage limité, tracé, finalité claire, révocable si applicable. Ne jamais transmettre le dossier complet à un partenaire.

## Inventaire observé en production (consultation, sans export de données personnelles)

Projet Supabase **3b discuter**, région **eu-west-1 (Irlande)**, au 15/10/2026 :
- **185/185 tables** du schéma `public` avec RLS activée ; **5 tables** RLS sans politique (accès refusé par défaut sauf chemin privilégié). **RLS activée ne signifie pas que toutes les politiques sont sûres**.
- Deux buckets de stockage observés (**destin-media** et **studio-3b**) sont **privés**, sans garantie sur les fichiers ni les autres canaux d'accès.
- `member_identity_claims` : politiques explicites refusant `anon` et `authenticated`. Le service possède néanmoins des droits privilégiés à contrôler.
- Les recommandations Supabase signalent 3 fonctions `SECURITY DEFINER` exécutables en tant qu'anonyme et 15 accessibles aux membres. Inspection partielle : accès d'administration conditionnés, sessions et limites de débit dans plusieurs fonctions. Ce ne sont pas automatiquement des fuites. **Ne pas retirer des droits de production sans tests fonctionnels spécifiques ; continuer la revue par fonction.**
- Protection Supabase contre les mots de passe divulgués désactivée ; selon la documentation officielle **réservée au plan Pro ou supérieur** → **EN ATTENTE DE VALIDATION DU COÛT**, sans achat automatique.
- Application publique hébergée chez Vercel, avec plusieurs en-têtes de sécurité déjà présents (CSP, HSTS, X-Frame-Options, Permissions-Policy), dont la compatibilité métier doit être maintenue.

## Travail gratuit : coffre local Santé

Code proposé dans la PR sécurité :
- Chiffrement Web Crypto AES-256-GCM et PBKDF2 SHA-256 (600 000 itérations), sel aléatoire propre au coffre, IV aléatoire renouvelé à chaque sauvegarde.
- Aucune clé persistée ; la dérivation se fait en mémoire à partir de la phrase secrète du membre.
- Activation facultative. Un ancien journal non chiffré reste disponible tant que sa conversion n'est pas demandée, pour empêcher une perte silencieuse.
- Export chiffré, restauration chiffrée locale et export **en clair identifié**.
- Aucune API supplémentaire, aucun nouvel hébergeur, aucune synchronisation vers 3B.
- La PWA reste vulnérable à un code malveillant de même origine exécuté pendant le déverrouillage ; sécurité mobile matérielle réservée à une future intégration native validée.
- Ne jamais transformer en coffre « sans mot de passe » si la clé finit elle-même dans le même stockage en clair.

## Travail gratuit : télémétrie tierce désactivée par défaut

L'envoi d'événements d'ouverture et de navigation à PostHog Europe passe désormais derrière **deux conditions cumulatives** : `VITE_POSTHOG_ENABLED=true` à la compilation et choix positif `3b_analytics_optin_v1=yes` sur le navigateur ; les signaux GPC/DNT restent prioritaires. Aucun formulaire d'activation n'est intégré dans cette évolution : l'analyse tierce est donc désactivée par défaut. Les compteurs internes du backend demeurent distincts.

## Travail à poursuivre AVANT de prétendre « sécurité prête pour des données médicales »

1. **Analyse RGPD** : registre des traitements, responsable de traitement juridiquement identifié, bases légales par finalité, droits d'accès/effacement et traitement des données sensibles ; examiner une AIPD (DPIA), en particulier en cas d'extension Santé ou de profilage.
2. **Sous-traitants** : contrats de sous-traitance et localisation/rétention exacte des données, logs, sauvegardes et accès support chez Supabase, Vercel, fournisseurs d'identité, e-mail et paiement. Ne pas présumer que le choix d'une région garantit zéro accès hors de cette région.
3. **Chiffrement Passeport** : étude séparée de la gestion des clés et de l'accès minimal. **Ne pas chiffrer arbitrairement les colonnes d'identité de production**, ce qui casserait les recherches et vérifications sans migration testée.
4. **Contrôle de l'accès serveur** : audit et tests des `SECURITY DEFINER`, journalisation sans PII, revue des droits et du moindre privilège ; audit de RLS en contexte `anon` / `authenticated` en mode simulation sans consulter des données réelles.
5. **Protection de l'identité** : ne jamais envoyer de document civil brut dans la télémétrie, les pièces jointes GitHub, les journaux d'erreurs ni à une IA tierce.
6. **Authentification** : MFA obligatoire pour administrateurs sur les consoles des fournisseurs, clés distinctes par service et rôle, secret management, revue des sessions, politique de rotation/révocation ; ne pas forcer la déconnexion générale sans plan de communication.
7. **Sauvegardes** : sauvegarde chiffrée et immuable/offline, test de restauration, rétention limitée et chiffrement des exports personnels. Éviter un serveur domestique pour des identités civiles de milliers de personnes sans exploitation professionnelle.
8. **Tests externes** : audit indépendant ou pentest avant extension sensible/medicale.
9. **Évolutions Santé** : analyser l'applicabilité HDS selon l'activité réelle (soins, prévention, suivi médico-social, etc.) ; refuser un hébergement inadapté si obligation HDS.
10. **Transferts entre hébergeurs** : ne migrer qu'après procédure contrôlée, chiffrement, sauvegarde/restauration validées, preuves d'effacement et contrats prêts ; **aucune migration automatique payante**.

## Matrice des dépenses

| Chantier | Coût nouveau | Décision |
|---|---|---|
| Coffre local dans le navigateur | 0 € d'abonnement additionnel | Développement gratuit, tester et valider |
| Journal Santé temporaire (pas de cloud) | 0 € additionnel | Garder par défaut |
| Désactiver l'analyse tierce optionnelle | 0 € additionnel | Gratuit |
| Tests statiques et CI existante | Dans les quotas actuels | Autorisé sans achat |
| Protection passwords compromis Supabase | Option Pro | **Attente** |
| Serveur dédié ou auto-hébergement professionnel en France | Dépend de l'hébergeur | **Attente** |
| Certification HDS / audit indépendant | Devis professionnel | **Attente** |
| Sauvegarde cloud externalisée payante | Dépend du volume | **Attente** |
| Vérification d'identité fournisseur live | Contrat et tarification | **Attente** |

## Références

- [CNIL — sécurité des données de santé](https://www.cnil.fr/fr/donnees-de-sante-un-imperatif-la-securite)
- [CNIL — applications mobiles Santé](https://www.cnil.fr/fr/applications-mobiles-en-sante-et-protection-des-donnees-personnelles-les-questions-se-poser)
- [Supabase — sécurité des mots de passe](https://supabase.com/docs/guides/auth/password-security)
- [Supabase — sécurité des API et politiques RLS](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase — notices et correctifs](https://supabase.com/docs/guides/database/database-linter)

**Suivi :** vérifier CI GitHub et recette fonctionnelle ; tant qu'ils ne sont pas verts et approuvés, ne pas revendiquer la fonction en production.
