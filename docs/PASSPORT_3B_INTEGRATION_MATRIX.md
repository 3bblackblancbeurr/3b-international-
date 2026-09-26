# Passeport 3B — matrice d'intégration

## Principe
Le Passeport 3B est l'identité commune, mais chaque produit reste un domaine séparé. Le Passeport ne donne pas un accès total à tout.

| Domaine | Identité | Autorité métier | Données minimales |
|---|---|---|---|
| Application 3B | Passeport 3B | services 3B | basic + profil |
| Monde du 3B | Passeport 3B | World state serveur | basic + progression |
| 3B MA VILLE | Passeport 3B | City server | basic + ville + économie serveur |
| Jeux 3B | Passeport 3B | serveur du jeu | basic + progression compétitive |
| Nosbloc | Passeport 3B | Nosbloc staging/prod | basic + créateur |
| Boutique | Passeport 3B | commerce/paiement | basic ; paiement séparé |
| Communauté | Passeport 3B | communauté/modération | basic + profil public |
| Stylcam | futur RP externe | Stylcam | basic + profil public, consentement |
| Wasla | futur RP externe | Wasla | basic + profil public, consentement |
| ALBERT | futur connecteur local | local-first | jeton court, scopes choisis |
| Aegis / Autonomie | systèmes séparés | leur backend | aucune donnée 3B par défaut |

## Règles
- jamais de mot de passe 3B transmis à une autre application ;
- jamais d'UUID Supabase exposé comme identifiant public ;
- jamais de Wallet/Coins modifiés par un client externe ;
- pas de scope générique "all" ;
- consentement explicite pour économie, inventaire, ville et créateur ;
- révocation d'un relying party indépendante de la suppression du compte ;
- les paiements restent séparés du credential d'identité ;
- une application tierce obtient une preuve/scopes, pas une copie complète du profil.

## Reconnaissance externe
Étape 1 : "Se connecter avec 3B" via OAuth/OIDC pour les services enregistrés.
Étape 2 : présentation d'un ThreeBPassportCredential compatible VC.
Étape 3 : vérification indépendante via OpenID4VP.
Étape 4 : évaluation eIDAS/EUDI et partenaires qualifiés si une reconnaissance réglementaire est recherchée.
