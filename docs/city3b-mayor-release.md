# Campagne du maire et boutique préparée

## Jeu disponible

72 missions : 54 principales et 18 facultatives, réparties en 18 chapitres.
Les objectifs principaux utilisent uniquement des bâtiments gratuits, les routes et les quartiers.
Le parcours de test part des 500 Coins initiaux, construit et réclame chaque récompense sans apport supplémentaire.
Les visiteurs et objets exposés ne bloquent aucun chapitre.

100 niveaux municipaux. Les seuils 1 à 50 restent inchangés.
Au-delà, le seuil du niveau n est 49 000 + (n − 50) × 1 000 + 40 × (n − 50) × (n − 49).
Le niveau 100 demande 201 000 XP ville. L’XP du compte 3B reste indépendante.
Les fonctions existantes conservent les trois sauvegardes et les récompenses déjà reçues.

Les habitants Lina, Sami, Nora, Aïcha, Élio, Inès, Maël et le Conseil accompagnent les missions.
Jade présente le journal 3B Actualités. La lecture vocale est volontaire et dépend des voix du navigateur.
Les conseils deviennent un bouton compact pendant le placement, le tracé et l’utilisation du catalogue.

## Paiements préparés, activation séparée

Les crédits boutique et les crédits Premium servent aux décorations facultatives.
Ils ne donnent ni Coins de construction ni XP et ne débloquent aucune mission.
Quatre lots sont créés dans l’environnement Stripe de test `acct_1UEaJJC3wYXh2i6l` :

| Lot | Prix de test | Prix Stripe |
| --- | --- | --- |
| 500 Crédits boutique | 4,99 € | price_1UMXyTC3wYXh2i6lO3srGpPg |
| 1 200 Crédits boutique | 9,99 € | price_1UMXzFC3wYXh2i6lUYn3sxoH |
| 100 Crédits Premium | 4,99 € | price_1UMXzGC3wYXh2i6lS94hEVF3 |
| 250 Crédits Premium | 9,99 € | price_1UMXzHC3wYXh2i6lFboHWqyg |

Ces prix sont des propositions de catalogue, modifiables avant ouverture.
Les thèmes et le Pass Architecte existants restent des achats permanents.
Un lot peut être acheté plusieurs fois. Chaque paiement vérifié produit une seule écriture de crédit.
La dépense d’un objet est atomique, vérifie son prix serveur et nécessite une confirmation dans l’interface.
Le catalogue affiche séparément le solde utilisable et une éventuelle dette.
Un remboursement ou litige révoque le lot entier ; les crédits déjà dépensés deviennent une dette compensée par les lots suivants.
L’historique de crédit est accessible uniquement au propriétaire ; les écritures passent exclusivement par le serveur.

Les deux nouvelles variables sont désactivées par défaut :

```dotenv
DIGITAL_STORE_EXPANSION_ENABLED=false
DIGITAL_STORE_CREDIT_SPEND_ENABLED=false
```

L’ouverture Stripe nécessite encore les variables existantes `APP_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`.
Les tests privés demandent `DIGITAL_STORE_TEST_ENABLED=true` et une liste UUID dans `DIGITAL_STORE_TEST_USER_IDS`.
Les paiements publics demandent explicitement `DIGITAL_STORE_LIVE_APPROVED=true`, des produits `live`
et des prix issus du même compte Stripe en mode réel. Ne pas copier les prix de test en mode réel.

## Vérification avant ouverture

1. Utiliser un compte de test privé et vérifier le webhook signé, le retour Checkout et la restauration du solde.
2. Vérifier les rejouements et les achats du même lot avec deux tentatives différentes.
3. Rembourser un lot avant et après dépense, vérifier la révocation et la dette.
4. Publier les prix définitifs et le fonctionnement des remboursements dans les conditions de boutique.
5. Activer les nouvelles variables seulement après ces vérifications.

Le module natif Google Play Billing / Apple In-App Purchase et la validation des reçus natifs
restent à raccorder aux comptes des boutiques. La présence d’un identifiant de produit ne rend pas l’achat natif actif.
Le serveur retourne `nativePurchasingEnabled=false` et les apps mobiles ne proposent pas Stripe comme solution de remplacement.
Les nouveaux produits Stripe sont préparés en sandbox ; aucun paiement réel n’a été activé par cette livraison.

## Tests

```sh
node --test tests/city3b-campaign.test.js tests/city3b-campaign-database.test.js tests/city3b-progression.test.js tests/city3b-advisors.test.js tests/city3b-save-slots.test.js tests/digital-credit-wallet.test.js tests/digital-store-expansion.test.js
```

Ces tests exécutent les migrations PostgreSQL dans PGlite et couvrent les permissions,
la campagne financée en solo, l’isolation des sauvegardes, les seuils, les achats répétés,
la dette et la protection d’un nouvel achat contre le remboursement d’un ancien achat.
