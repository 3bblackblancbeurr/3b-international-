# Sécurité paiement boutique 3B

- Les données de carte sont saisies sur Stripe Checkout, pas dans l’application.
- Le navigateur ne choisit jamais le montant : le serveur accepte uniquement le `default_price` actif d’un produit publié dans le catalogue Stripe ; les anciens prix encore actifs sont ignorés.
- Le serveur vérifie origine, contenu JSON, quantités et limite de commande.
- La session Stripe doit revenir de `checkout.stripe.com`.
- La confirmation client requiert un cookie HTTP-only signé et l’état Stripe est relu côté serveur.
- Le webhook est vérifié avec sa signature Stripe.
- Une commande n’est enregistrée comme payée que si Stripe indique `status=complete` et `payment_status=paid`.
- Les commandes sont stockées dans Supabase via la clé service uniquement côté serveur.
- Le vendeur est autorisé côté serveur par la table privée dédiée `shop_staff` avant lecture des coordonnées ou changement du statut de traitement ; `community_staff` reste limité à la modération.
- Les remboursements sont relus depuis Stripe puis appliqués de façon monotone et atomique à `shop_orders`. Un remboursement partiel ou total bloque l’expédition.
- Les notifications en échec, ou restées `pending` plus de cinq minutes, sont réclamées atomiquement avec un numéro de tentative. Resend reçoit une clé d’idempotence stable ; Twilio ne fournit pas une garantie équivalente après une coupure réseau ambiguë.
- Une clé Stripe Live exige `SHOP_LIVE_APPROVED=true` en plus des verrous de lancement habituels. Cette valeur doit rester `false` tant que les validations humaines et E2E ne sont pas terminées.
- `SHOP_ENABLED=false` reste la valeur par défaut ; les vrais paiements ne doivent pas être ouverts avant validation test et informations vendeur définitives.
