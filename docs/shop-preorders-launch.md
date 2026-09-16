# Boutique 3B — préparation ouverture et précommandes

Ce document traduit le fonctionnement déjà présent dans `server/shop.js` et `src/shop/ShopPage.jsx` en procédure d’ouverture. Le but est d’éviter d’activer les paiements avant que le catalogue, la livraison et les conditions commerciales soient cohérents.

## 1. Données obligatoires pour chaque produit Stripe

Créer un produit Stripe actif avec un prix **one_time** actif en EUR, taxes incluses, puis renseigner :

- `shop_visible=true` si `STRIPE_CATALOG_MODE=metadata` ;
- `shop_group` : identifiant stable du produit pour regrouper les variantes ;
- `shop_name` : nom public 3B ;
- `size` : taille de la variante (`XS`, `S`, `M`, etc. ou `Taille unique`) ;
- `color` : couleur publique ;
- `max_per_order` : quantité maximum d’une variante, de 1 à 5 ;
- description complète du produit ;
- première image Stripe = visuel public principal de la variante.

En mode allowlist, ajouter chaque identifiant `price_...` autorisé à `STRIPE_PRICE_IDS`.

## 2. Précommande

Tant que les dates de production et de livraison ne sont pas fermes, afficher les produits comme **précommandes** dans les textes et visuels commerciaux, et ne jamais présenter une estimation comme une date garantie.

Pour chaque lancement en précommande, valider avant activation :

- quantité maximale réellement disponible ;
- date de fermeture de la précommande ;
- fenêtre d’expédition estimée ;
- pays livrés ;
- prix TTC ;
- frais de livraison ;
- règles d’annulation et de remboursement applicables ;
- procédure si la production est retardée ou annulée ;
- adresse/contact SAV public.

La fiche produit doit clairement distinguer : **En stock**, **Précommande**, **Épuisé** et **Indisponible**. Ne pas utiliser `SHOP_ENABLED=true` tant que cette information et les conditions de vente ne sont pas finalisées.

## 3. Variables d’ouverture requises par le code actuel

La boutique ne devient payable que si toutes les conditions suivantes sont satisfaites :

- `SHOP_ENABLED=true` ;
- `APP_URL` valide ;
- `STRIPE_SECRET_KEY` ;
- `STRIPE_WEBHOOK_SECRET` ;
- `SUPABASE_URL` ;
- `SUPABASE_SERVICE_ROLE_KEY` ;
- `STRIPE_SHIPPING_RATE_ID` actif ;
- catalogue Stripe configuré ;
- `SHOP_TERMS_URL` ;
- `SHOP_PRIVACY_URL` ;
- `SHOP_SHIPPING_URL` ;
- `SHOP_RETURNS_URL` ;
- `SHOP_LEGAL_URL` ;
- `SHOP_SHIPPING_COUNTRIES` limité aux pays autorisés par l’intégration : FR, IT, EE, TR, DZ, TN, MA, ES.

## 4. Fiche produit minimum

Chaque produit publié doit avoir :

1. nom exact ;
2. 3 à 6 photos nettes : face, dos, détail logo/matière, porté si disponible ;
3. description courte ;
4. composition/matière ;
5. guide des tailles ;
6. couleurs et tailles réellement disponibles ;
7. prix TTC ;
8. statut stock ou précommande ;
9. estimation d’expédition si précommande ;
10. lien vers livraison, retours et CGV.

## 5. Test avant passage en production

Effectuer au minimum :

- chargement du catalogue sans erreur ;
- sélection de chaque variante ;
- ajout/suppression panier et quantité maximale ;
- refus d’un prix non autorisé ;
- paiement Stripe en mode test ;
- retour `checkout=success` ;
- vérification `/api/order-status` ;
- création de la commande Supabase ;
- webhook Stripe reçu une seule fois même en cas de retry ;
- réduction fidélité correcte si applicable ;
- affichage correct des liens livraison/retours/CGV/confidentialité/mentions légales ;
- test mobile 360–390 px ;
- test d’une commande annulée et d’une session expirée.

## 6. Critère GO LIVE

Passage en réel uniquement lorsque : catalogue final validé + politiques publiées + livraison configurée + paiement test réussi + webhook vérifié + commande visible côté back-office + procédure SAV prête.
