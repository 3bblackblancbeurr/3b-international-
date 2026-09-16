# Parcours vendeur 3B

- Paiement confirmé → **En attente de prise en charge**.
- Échéance affichée au client : **5 jours maximum** pour prise en charge.
- Action vendeur : **Je prends en charge**.
- Statut → **Préparation en cours**.
- Échéance d’expédition calculée automatiquement : **2 jours après la prise en charge**.
- Action vendeur : **Marquer comme expédiée**.
- Statut client → **Commande expédiée**.

Les actions vendeur passent par `/api/shop-admin-orders` et exigent une session 3B authentifiée appartenant à `community_staff`.
