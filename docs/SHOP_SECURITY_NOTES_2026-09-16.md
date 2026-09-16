# Sécurité paiement boutique 3B

- Les données de carte sont saisies sur Stripe Checkout, pas dans l’application.
- Le navigateur ne choisit jamais le montant : le serveur accepte uniquement un `price_id` publié dans le catalogue Stripe.
- Le serveur vérifie origine, contenu JSON, quantités et limite de commande.
- La session Stripe doit revenir de `checkout.stripe.com`.
- La confirmation client requiert un cookie HTTP-only signé et l’état Stripe est relu côté serveur.
- Le webhook est vérifié avec sa signature Stripe.
- Une commande n’est enregistrée comme payée que si Stripe indique `status=complete` et `payment_status=paid`.
- Les commandes sont stockées dans Supabase via la clé service uniquement côté serveur.
- Le vendeur est autorisé côté serveur par `community_staff` avant lecture des coordonnées ou changement du statut de traitement.
- `SHOP_ENABLED=false` reste la valeur par défaut ; les vrais paiements ne doivent pas être ouverts avant validation test et informations vendeur définitives.
