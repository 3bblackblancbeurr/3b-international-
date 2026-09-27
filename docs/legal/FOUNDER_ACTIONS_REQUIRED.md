# 3B — CE QUE LE FONDATEUR DOIT FOURNIR
## Document interne — ne pas publier tel quel

L'objectif est que le fondateur n'ait pas à comprendre GitHub, Supabase, Stripe ou le code. Les éléments ci-dessous sont uniquement ceux qui ne peuvent pas être inventés ou signés par l'assistant.

## Bloc A — création de l'activité

À obtenir / décider avant toute vente réelle :

- [ ] Forme d'exploitation choisie (ex. entreprise individuelle/micro, EURL, SASU, autre) après conseil adapté à la situation réelle.
- [ ] Formalité de création déposée sur le Guichet unique des formalités d'entreprises.
- [ ] Identité ou raison sociale exacte.
- [ ] SIREN / SIRET / inscription RNE et, si applicable, RCS.
- [ ] Adresse professionnelle à publier.
- [ ] Régime TVA/fiscal confirmé.
- [ ] Adresse e-mail professionnelle et moyen de contact client définitifs.

Préparation habituelle du Guichet unique : pièce d'identité à jour, justificatif de domicile, numéro de sécurité sociale et informations sur l'activité. Le dépôt/signature de la formalité doit être réalisé par le fondateur ou son mandataire.

Source officielle à vérifier au moment de la démarche :
- https://formalites.entreprises.gouv.fr/
- https://formalites.entreprises.gouv.fr/preparer.php

## Bloc B — argent

- [ ] Compte bancaire dédié/professionnel choisi selon la forme retenue.
- [ ] Stripe Live créé/activé au nom de l'activité.
- [ ] Vérification d'identité/KYC Stripe terminée par le fondateur.
- [ ] Compte bancaire de versement ajouté directement dans Stripe.
- [ ] Régime de taxe/TVA confirmé avant d'activer Stripe Tax ou `SHOP_AUTOMATIC_TAX`.

Ne jamais transmettre de mot de passe, code 2FA, numéro complet de carte ou secret Stripe dans GitHub.

## Bloc C — boutique

Le fondateur doit simplement décider/valider :

- [ ] Prix de vente final par produit.
- [ ] Pays servis au lancement.
- [ ] Frais de livraison / livraison incluse.
- [ ] Délais réalistes de traitement et d'expédition.
- [ ] Adresse et procédure de retour.
- [ ] Politique commerciale pour personnalisations éventuelles.
- [ ] Contact SAV.
- [ ] Médiateur de la consommation choisi et contrat/adhésion obtenu.

Sources officielles :
- https://www.economie.gouv.fr/mediation-conso/vous-etes-un-professionnel/vos-principales-obligations-0
- https://www.economie.gouv.fr/entreprises/developper-son-entreprise/innover-et-numeriser-son-entreprise/mentions-sur-votre-site-internet-les-obligations-respecter

## Bloc D — utilisateurs et mineurs

Avant forte ouverture communautaire :

- [ ] Âge minimum du compte 3B décidé.
- [ ] Ce qui est public par défaut sur un profil mineur décidé.
- [ ] Messagerie/contact entre utilisateurs mineurs et adultes décidé.
- [ ] Géolocalisation optionnelle : oui/non.
- [ ] Marketing/newsletter : oui/non.
- [ ] Procédure parentale décidée pour les traitements basés sur le consentement lorsque nécessaire.

En France, pour les traitements d'un service en ligne fondés sur le consentement non contractuel, la CNIL rappelle qu'en dessous de 15 ans l'accord conjoint de l'enfant et d'un titulaire de l'autorité parentale est requis.

Source :
- https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans

## Ce que l'assistant fera dès que ces éléments existent

- compléter les mentions légales ;
- produire les CGV adaptées à la boutique réelle ;
- finaliser la politique de confidentialité ;
- compléter le registre RGPD ;
- aligner Stripe test puis préparer Live sans l'activer prématurément ;
- mettre les variables de production dans la checklist ;
- tester achat, webhook, commande, remboursement et isolation compte A/B ;
- contrôler les pages avant ouverture ;
- maintenir les paiements fermés tant qu'un point critique reste rouge.
