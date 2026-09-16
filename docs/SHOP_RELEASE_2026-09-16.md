# Boutique 3B — release 16 septembre 2026

## Produit
- Pull 3B International noir ou blanc.
- Prix catalogue : 80 € TTC.
- Livraison France incluse dans le prix.
- 8 logos brodés thermocollants à chaud : Italie, France, Algérie, Estonie, Maroc, Tunisie, Espagne, Turquie.
- 3 visuels premium optimisés en WebP dans `public/shop/`.

## Paiement
- Stripe Checkout hébergé reste le seul parcours de paiement.
- Prix, variantes, origine et total sont vérifiés côté serveur.
- Les cartes bancaires ne transitent pas dans l’application 3B.
- La production reste fermée tant que les secrets Vercel et les informations vendeur définitives ne sont pas configurés.

## Traitement des commandes
1. Paiement confirmé.
2. Statut `awaiting_seller` : paiement reçu, attente de prise en charge.
3. Le vendeur 3B dispose de 5 jours maximum pour cliquer « Je prends en charge ».
4. Statut `processing` : préparation en cours, échéance d’expédition fixée à +2 jours.
5. Le vendeur clique « Marquer comme expédiée ».
6. Statut `shipped` visible par le client.

L’accès vendeur est vérifié côté serveur via `community_staff`. Le suivi client ne renvoie ni l’e-mail ni l’adresse privée de livraison.
