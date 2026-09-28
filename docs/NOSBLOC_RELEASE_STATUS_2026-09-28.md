# Nosbloc du 3B — état de sortie au 28 septembre 2026

## Verdict

Nosbloc dispose d'un **backend production et d'un client V2 Premium**, mais la plateforme n'est pas encore ouverte au public.

## Production vérifiée

- Edge Function `nosbloc-api` active avec JWT obligatoire ;
- projets cloud ;
- versions immuables ;
- équipes et invitations ;
- produits / commandes / entitlements ;
- ledger et wallets ;
- remboursements ;
- demandes de retrait ;
- modération ;
- audit log ;
- configuration runtime.

## Garde-fous production

Configuration actuelle :
- serveur : activé ;
- Discover : désactivé ;
- paiements : désactivés ;
- retraits : désactivés.

Le shell public garde Nosbloc dans **EN PRÉPARATION**.

## Pourquoi ce n'est pas encore « fini »

Il n'y a encore aucun usage production réel enregistré dans les tables Nosbloc au moment de cet audit :
- 0 projet ;
- 0 version ;
- 0 produit ;
- 0 commande ;
- 0 demande de retrait ;
- 0 entrée de modération.

Donc le système est techniquement préparé, mais il n'a pas encore subi la beta réelle qui permettrait de valider les flux humains.

## Conditions avant ouverture

1. beta privée avec plusieurs créateurs ;
2. tests multi-appareils ;
3. modération réelle + signalement + appel ;
4. tests d'assets lourds et scripts ;
5. anti-spam / anti-abus ;
6. validation des droits ;
7. charge et récupération ;
8. KYC/KYB et fiscalité avant argent réel ;
9. remboursement / litige / réserve ;
10. pilote financier limité avant retraits automatisés.

## Décision

Ne pas activer Discover, paiements ou retraits tant que les étapes précédentes ne sont pas validées.
