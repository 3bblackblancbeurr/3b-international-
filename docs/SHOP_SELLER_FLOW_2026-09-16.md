# Parcours vendeur 3B

- Paiement confirmé → **En attente de prise en charge**.
- Échéance affichée au client : **5 jours maximum** pour prise en charge.
- Action vendeur : **Je prends en charge**.
- Statut → **Préparation en cours**.
- Échéance d’expédition calculée automatiquement : **2 jours après la prise en charge**.
- Action vendeur : **Marquer comme expédiée**.
- Statut client → **Commande expédiée**.

Les actions vendeur passent par `/api/shop-admin-orders` et exigent une session 3B authentifiée appartenant à la table privée `shop_staff`. Le rôle de modération communautaire `community_staff` ne donne plus accès aux coordonnées client ni aux transitions de commande. Après déploiement de la migration boutique, un administrateur doit ajouter explicitement le ou les UUID vendeur autorisés dans `shop_staff` via un accès service sécurisé.

Tout remboursement Stripe, partiel ou total, place la commande au statut `refunded` et bloque donc les actions de prise en charge et d’expédition. `refund_status` conserve la distinction `partial` / `full` et `amount_refunded` le montant réellement confirmé par Stripe.
