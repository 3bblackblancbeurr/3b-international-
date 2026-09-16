# Derniers verrous avant argent réel

1. Connecter le compte Vercel du projet 3B à la session disponible.
2. Ajouter les secrets serveur Stripe et Supabase dans Vercel.
3. Régler `SHOP_SHIPPING_INCLUDED=true` et conserver d’abord Stripe en mode test.
4. Faire un paiement test complet et vérifier la commande dans Supabase + panneau vendeur + suivi client.
5. Finaliser les informations vendeur obligatoires (identité/statut/adresse et pages commerciales correspondantes).
6. Seulement ensuite configurer Stripe live et activer les vrais paiements.

Aucun secret ne doit être commité dans GitHub.
