# 3B — REGISTRE RGPD DE TRAVAIL
## PROJET INTERNE — À VALIDER AVANT PUBLICATION / LANCEMENT COMMERCIAL

Ce registre est une base technique issue du fonctionnement actuellement observé de 3B. Il ne remplace pas la validation juridique des finalités, bases légales et durées.

| Traitement | Données principales | Finalité | Base légale candidate | Destinataires / sous-traitants | Conservation | État |
| --- | --- | --- | --- | --- | --- | --- |
| Compte / authentification | email, identifiant interne, session, date création, données de récupération | créer et sécuriser le compte | exécution du service / contrat | Supabase Auth, backend 3B | À définir précisément | À compléter |
| Passeport 3B | identifiant public opaque, nom affiché, pays 3B, état/version | identité 3B et progression | exécution du service | 3B / Supabase | À définir | Technique durci |
| Identité civile déclarée | prénom(s) officiels, nom de famille officiel, date de naissance | préparer la vérification d’identité et distinguer identité publique / civile | consentement spécifique + exécution du service, à valider | 3B / Supabase | À définir précisément | Zone service-only préparée |
| Vérification d’identité externe | résultat, niveau de garantie, état, dates, référence prestataire pseudonymisée | vérifier qu’une personne est bien titulaire d’une identité déclarée | base légale à confirmer selon usage / contrat | futur prestataire PVID/IDV + 3B | À définir avec le prestataire | DÉSACTIVÉ tant que fournisseur non contractualisé |
| Progression / XP / Coins / inventaire | identifiant compte, XP, points/Coins, objets, événements | fournir les fonctions jeux/monde | exécution du service | 3B / Supabase | À définir | Actif |
| Sauvegardes jeux/Monde | identifiant, snapshots, progression, préférences | reprise et continuité de jeu | exécution du service | 3B / Supabase | À définir | Actif selon module |
| Communauté | profil, publications, interactions, abonnements, signalements, blocages | fonctionnalités sociales et modération | contrat + intérêt légitime à sécuriser, à valider | 3B / Supabase | À définir par type | À auditer module par module |
| Sécurité / anti-abus | session, événements techniques, rate-limit, IP condensée lorsque prévu | prévention fraude/abus/sécurité | intérêt légitime candidat, à documenter | 3B / Supabase / hébergeur | Durée courte à définir | Partiellement documenté |
| Mesure audience interne | identifiant aléatoire de session, rubrique, affichage, activité | statistiques et qualité produit | exemption/consentement selon configuration réelle | 3B | À définir | À vérifier |
| PostHog EU | ouverture app, rubrique consultée, identifiant session selon config | mesure audience | exemption possible seulement si conditions CNIL satisfaites ; sinon consentement | PostHog EU | À définir/valider | Audit cookies requis |
| Commandes boutique | email, nom, adresse livraison, articles, montant, références Stripe | vente, livraison, SAV, obligations comptables | contrat + obligations légales | Stripe, 3B, Supabase, transporteur futur | Durées légales/opérationnelles à définir | Paiement réel fermé |
| Paiement carte | données de paiement | encaissement | contrat / obligations paiement | Stripe | Selon Stripe et obligations applicables | 3B ne doit pas stocker le PAN complet |
| Notifications commande | email client, email/téléphone vendeur, statut commande | informer vendeur/client | exécution du contrat | Resend/Twilio si configurés | À définir | Providers optionnels |
| Demandes RGPD / suppression | identité de demandeur, demande, traces nécessaires | répondre aux droits | obligation légale | 3B / prestataires concernés | À définir | Mécanisme suppression présent |
| Nosbloc créateurs | compte, créations, transactions, équipe, modération | plateforme créateurs | À qualifier précisément | 3B / Supabase / futur Stripe Connect | À définir | Argent réel bloqué |
| KYC/payouts Nosbloc | identité, données entreprise, informations de paiement | vérifier et payer des créateurs | obligations légales/contractuelles à déterminer | Stripe Connect principalement | Selon obligations | NE PAS ACTIVER avant cadrage |

## Informations qui manquent pour rendre le registre final

- identité et coordonnées du responsable de traitement ;
- point de contact vie privée ;
- bases légales finales par traitement ;
- durées de conservation chiffrées ou critères précis ;
- liste contractuelle des sous-traitants ;
- localisation des traitements et transferts éventuels hors EEE ;
- mesures de sécurité documentées par traitement ;
- procédure de violation de données ;
- matrice mineurs/consentements ;
- analyse d’impact / DPIA à déterminer avant activation d’une vérification biométrique ou documentaire à distance ;
- politique de conservation des données d’identité et des résultats de vérification ;
- contrat et liste des sous-traitants du futur prestataire d’identité ;
- traitements exacts activés en production le jour du lancement.

## Règles techniques déjà vérifiées le 27/09/2026

- aucune table `public` sans RLS exposée directement à `anon/authenticated` lors du contrôle ;
- aucune fonction `SECURITY DEFINER` publiquement exécutable inspectée sans `search_path` verrouillé ;
- aucune policy RLS trouvée reposant sur `user_metadata/raw_user_meta_data` ;
- bucket Storage `studio-3b` privé, avec MIME images limités ;
- vues publiques inspectées avec `security_invoker=true`.

## Sources de référence

- Information des personnes : https://www.cnil.fr/fr/informer-les-personnes
- Durées de conservation : https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees
- Cookies / mesure audience : https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience
- Consentement mineurs : https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans
