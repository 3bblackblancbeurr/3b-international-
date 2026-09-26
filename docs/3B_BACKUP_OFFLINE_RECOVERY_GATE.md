# 3B — sauvegarde, restauration et mode dégradé

## Règles de production
- Le serveur reste l'autorité pour Passeport, XP/Coins, inventaire, Ville, progression Monde et résultats compétitifs.
- Le localStorage ne doit jamais devenir l'autorité d'une donnée économique ou d'identité.
- Une coupure réseau ne doit jamais inventer une réussite.
- Les écritures rejouables utilisent un identifiant d'idempotence.
- Les écrans peuvent afficher le dernier snapshot connu en lecture seule si le réseau tombe.
- Toute action nécessitant le serveur reste en attente ou échoue explicitement.

## Sauvegarde
Domaines à vérifier séparément :
1. compte/Passeport ;
2. économie et ledger ;
3. inventaire ;
4. Monde et progression ;
5. MA VILLE ;
6. Nosbloc versions ;
7. jeux compétitifs.

## Restauration
Une restauration valide doit préserver :
- le même titulaire ;
- le même passport_public_id ;
- le ledger sans duplication ;
- les objets permanents ;
- la dernière révision serveur valide ;
- aucune récompense supplémentaire lors du replay.

## Réseau faible
Le client doit :
- utiliser des timeouts bornés ;
- empêcher les doubles soumissions ;
- conserver les formulaires non sensibles ;
- afficher synchronisation/hors-ligne clairement ;
- reprendre depuis le serveur au retour du réseau.

## Gate physique restant
La CI ne remplace pas :
- Samsung réel ;
- rotation portrait/paysage ;
- reprise après verrouillage écran ;
- Wi-Fi -> 4G/5G ;
- mode avion pendant une action ;
- extinction forcée puis redémarrage.
