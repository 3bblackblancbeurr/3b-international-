# 3B Digital Store V1

## Objectif

Un seul moteur d’achats numériques sécurisés, utilisé séparément par :

- Monde du 3B ;
- Créer ma Ville.

Les deux jeux gardent leur progression indépendante. Seul l’inventaire lié au Passeport 3B est commun.

## Règles verrouillées

- aucun produit premium ne donne de puissance ;
- aucun objet acheté avec argent réel n’est revendable ou échangeable au lancement ;
- attribution uniquement après vérification serveur du fournisseur ;
- chaque transaction fournisseur est idempotente ;
- remboursement ou contestation complète = entitlement révoqué + instance d’objet retirée de l’usage ;
- aucune donnée brute de carte bancaire n’entre dans 3B ;
- aucun reçu brut n’est stocké : seulement une empreinte/hash et les références nécessaires ;
- Stripe Live est fail-closed tant que DIGITAL_STORE_LIVE_APPROVED n’est pas explicitement activé ;
- Stripe test nécessite DIGITAL_STORE_TEST_ENABLED + une allowlist DIGITAL_STORE_TEST_USER_IDS ;
- Android natif ne doit pas basculer vers Stripe pour les biens numériques ;
- iOS natif ne doit pas basculer vers Stripe pour les biens numériques.

## Catalogue test initial

### Monde du 3B

- Veste Kaïs Origine Premium — 4,99 €
- Aura Matrix — 2,99 €
- Effet Cercle Brisé — 3,99 €
- Arrivée Huit Portes — 5,99 €
- Refuge Champagne — 7,99 €

### Créer ma Ville

- Routes Matrix — 1,99 €
- Architecture Champagne — 6,99 €
- Waterfront Premium — 8,99 €
- Monument Cercle Brisé — 9,99 €
- Thème Nuit Luxe — 3,99 €

Tous ces produits sont créés dans l’environnement Stripe de test 3B et enregistrés en release_state=test dans Supabase.

## Fournisseurs

### Web

Stripe Checkout hébergé. Le webhook partagé /api/stripe-webhook distingue les commandes physiques de la boutique textile et les biens numériques par metadata.integration.

### Android

Conception prévue pour Google Play Billing. Les Product IDs restent null tant qu’ils ne sont pas créés dans Play Console. L’application native ne propose pas Stripe comme contournement.

### iOS

Conception prévue pour Apple In-App Purchase / StoreKit. Les Product IDs restent null tant qu’ils ne sont pas créés dans App Store Connect. L’application native ne propose pas Stripe comme contournement.

## Chaîne d’autorité

Paiement fournisseur
→ vérification serveur
→ contrôle produit/prix/compte
→ digital_store_purchases
→ digital_store_entitlements
→ item_instances
→ inventaire du Passeport.

En sens inverse :

remboursement / contestation
→ webhook signé
→ digital_store_revoke_purchase
→ entitlement revoked
→ item_instance retired.

## Ce qui reste avant le Live

1. Créer les 10 Product IDs Google Play.
2. Créer les 10 In-App Purchases Apple.
3. Ajouter le module de facturation natif Android.
4. Ajouter StoreKit côté iOS.
5. Implémenter la vérification serveur Google/Apple avec leurs credentials de production.
6. Tester achat, restauration, changement d’appareil, remboursement et révocation sur les sandbox stores.
7. Valider fiscalité/CGV/RGPD et politique de remboursement.
8. Passer les produits de test/ready à live uniquement après validation.
