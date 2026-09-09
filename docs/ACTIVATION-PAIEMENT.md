# Paiement 3B — installation et activation

> Reprise : les changements sont intégrés à la branche `chatgpt-improvements`. Lire `CHANGEMENTS-CHATGPT-IMPROVEMENTS.md` pour les correctifs et vérifications actuels. Après installation du connecteur GitHub, la création de cette branche distante a réussi. Les informations de préparation ci-dessous décrivent l’intégration initiale. La fusion et la mise en production restent soumises à validation.

Version préparée le 8 septembre 2026 sur la branche locale `codex/boutique-stripe`, à partir du commit `e49195ef95586119f702569480d5ae7454c30d25` du dépôt `3bblackblancbeurr/3b-international-`.

Le code est préparé et testé avec des doubles de Stripe et de la base de données. Il n’est pas déployé. Aucun compte Stripe, produit marchand ou paiement réel n’a été créé pendant ce travail. L’aperçu de la nouvelle interface n’a pas pu être ouvert dans le navigateur de vérification. Effectuer la recette visuelle et un vrai parcours Stripe en mode test avant la production.

## Ce qui est ajouté

- La case Boutique de l’application affiche désormais `ShopPage` : catalogue, variantes, prix TTC, panier, quantités et retrait d’un article.
- Les références et quantités du panier sont conservées localement, indépendamment des données du passeport.
- Le catalogue provient des produits explicitement publiés dans Stripe. L’ajout d’un vêtement ne nécessite pas de changer le code ou de redéployer. Aucun vêtement, visuel ou tarif fictif n’est ajouté à l’application.
- Stripe Checkout collecte les coordonnées et la carte sur sa page de paiement. Le site 3B ne collecte pas les numéros de carte.
- Le serveur contrôle les articles, les quantités et les tarifs. Le navigateur ne décide jamais du montant à facturer.
- Un retour vers la boutique affiche la confirmation après vérification serveur. Une URL portant le mot « success » ne suffit jamais à valider une commande.
- Le webhook signé enregistre une commande payée même si l’acheteur ne revient pas sur le site. Les doublons préservent le statut d’expédition déjà saisi.
- Les commandes sont enregistrées dans une table Supabase protégée. Le compte membre local existant ne donne aucun droit sur cette table.

La page d’entrée, le menu BLACK • BLANC • BEUR, le manga, le passeport et les clés de stockage existantes sont conservés. `src/App.css` n’est pas modifié. Le lien `/#boutique` ouvre directement la boutique et permet le retour depuis Stripe.

## Installer maintenant, sans vêtements

La boutique peut être publiée dès que l’accès au dépôt et au projet Vercel le permet, avec `SHOP_ENABLED=false` et sans catalogue. Elle affiche « Collection en préparation », une présentation 3B et un panier vide avec le paiement désactivé. Aucune clé Stripe n’est nécessaire pour cet affichage d’attente.

La configuration Stripe, Supabase et commerciale décrite ci-dessous reste à effectuer une fois avant l’ouverture des ventes. Ensuite, les ajouts de produits se font dans Stripe, sans nouvelle modification du site. Le guide `AJOUTER-MES-VETEMENTS.md` explique cette utilisation courante. La maquette illustrée ne fournit aucun article réel au catalogue.

## 1. Appliquer la modification sur le bon dépôt

Utiliser le compte GitHub `3bblackblancbeurr`, avec ChatGPT Codex Connector installé pour le dépôt `3bblackblancbeurr/3b-international-`. La branche de reprise est `chatgpt-improvements` ; consulter sa Pull Request avant toute fusion. Les commandes de patch ci-dessous servent uniquement à une reprise manuelle de l’intégration initiale.

L’archive fournie contient un patch Git. Depuis une copie propre de la version de départ :

```bash
git switch -c integration-boutique-stripe
git apply --check /chemin/vers/boutique-stripe.patch
git apply /chemin/vers/boutique-stripe.patch
npm ci
npm run test:shop
npm run build
```

Si `git apply --check` échoue, comparer la version actuelle à la version de départ et adapter les changements. Ne pas écraser une version plus récente de `App.jsx` avec une copie ancienne.

## 2. Préparer Stripe en mode test

Créer ou utiliser le compte Stripe professionnel destiné à 3B. Commencer avec ses clés et ses produits de test. Préférer une clé restreinte autorisant les opérations requises : lecture des produits, prix et tarifs de livraison, création et lecture des sessions Checkout et de leurs lignes. Renseigner cette clé dans `STRIPE_SECRET_KEY` comme variable sensible Vercel, avec le secret de signature du webhook. Ne jamais les saisir dans le chat, les fichiers publics ou une variable `VITE_`.

Pour chaque variante vendable :

1. Créer un produit Stripe dont le nom indique clairement le vêtement, la taille et la couleur. Ce nom apparaîtra aussi dans le paiement et la commande.
2. Ajouter une vraie photo et une description utile : matière, coupe, finitions et conditions de disponibilité.
3. Créer un prix ponctuel en EUR, par unité, avec les taxes incluses, puis le choisir comme prix par défaut du produit. Les abonnements, prix HT, transformations de quantité et produits archivés sont exclus par le code.
4. Dans les métadonnées du produit, définir `size`, `color`, et éventuellement `max_per_order` entre 1 et 5.
5. Pour regrouper plusieurs variantes dans une même fiche, leur attribuer les mêmes métadonnées de produit `shop_group` et `shop_name`. Le nom propre à chaque produit Stripe doit continuer d’identifier sa variante.
6. Quand la fiche est prête à être montrée, définir sa métadonnée de produit `shop_visible` à `true`. Avec `STRIPE_CATALOG_MODE=metadata`, elle apparaît au prochain chargement de la boutique. Aucun identifiant de prix n’est à copier dans Vercel pour chaque nouvel article.

Le mode historique reste disponible : `STRIPE_CATALOG_MODE=allowlist` avec les identifiants dans `STRIPE_PRICE_IDS` et les variantes dans les métadonnées des prix. Il est limité à 50 prix et nécessite une modification de configuration pour les ajouts ; le mode `metadata` est celui prévu pour l’utilisation demandée. Les métadonnées `size`, `color` et `max_per_order` d’un prix ancien restent prioritaires si elles existent aussi sur le produit.

Pour retirer un article du catalogue, passer `shop_visible` à `false` ou archiver le produit. Le serveur relit Stripe avant de créer chaque nouveau paiement et refuse les références qui viennent d’être retirées. Les paiements déjà ouverts ne sont pas annulés par ce changement et ne constituent pas une réservation de stock.

Créer un tarif de livraison fixe en EUR dans Stripe, y compris si la livraison est gratuite, et renseigner `STRIPE_SHIPPING_RATE_ID`. La configuration initiale propose la France uniquement. Une même tarification est appliquée à tous les pays autorisés ; adapter le calcul avant de proposer des tarifs différents selon les destinations.

Configurer les informations publiques du commerce, les conditions de vente et la politique de confidentialité dans Stripe. L’acceptation des conditions y est obligatoire. Activer les reçus dans les réglages Stripe si souhaité ; aucun service d’e-mail 3B séparé n’est livré.

## 3. Préparer l’enregistrement des commandes

Exécuter `supabase/shop-orders.sql` dans le projet Supabase de test concerné. Le script crée uniquement la nouvelle table `shop_orders` et ses permissions. Vérifier une éventuelle table existante portant ce nom avant son exécution.

Renseigner `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` exclusivement côté serveur. La clé publique `VITE_SUPABASE_ANON_KEY` ne remplace pas la clé serveur. La table n’est ni lisible ni modifiable par les visiteurs ou les comptes du navigateur.

La création du paiement vérifie que la table est accessible. Après paiement, l’application enregistre le total, les articles et leurs variantes, les coordonnées de livraison et la référence Stripe. Les données sont conservées pour le traitement de la commande ; définir leur durée de conservation et leur accès administratif selon les besoins réels du commerce.

## 4. Configurer Vercel

Garder le projet Vite existant, sa commande de build et son dossier de sortie. Les quatre fichiers `api/*.js` sont des Vercel Functions utilisant les objets Web Request/Response. Ne pas rediriger les chemins `/api/*` vers `index.html`.

Copier les noms de variables de `.env.example` dans l’environnement de prévisualisation du bon projet Vercel, puis renseigner leurs valeurs :

| Variable | Valeur attendue |
|---|---|
| `APP_URL` | Origine HTTPS exacte de la prévisualisation ou de la production, sans chemin. |
| `STRIPE_SECRET_KEY` | Clé secrète correspondant à cet environnement. |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook de cet environnement. |
| `STRIPE_CATALOG_MODE` | `metadata` : gestion des vêtements dans Stripe, sans modifier le site à chaque ajout. |
| `STRIPE_PRICE_IDS` | Vide en mode `metadata`. Utilisé uniquement avec le mode historique `allowlist`. |
| `STRIPE_SHIPPING_RATE_ID` | Tarif de livraison Stripe actif en EUR. |
| `SHOP_SHIPPING_COUNTRIES` | `FR` initialement ; seuls les huit pays 3B sont acceptés par cette première configuration. |
| `SHOP_AUTOMATIC_TAX` | `false` initialement ; activer uniquement après configuration fiscale de Stripe. |
| `SUPABASE_URL` | Adresse du projet Supabase concerné. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur privée, jamais publique. |
| `SHOP_TERMS_URL` | Adresse HTTPS des conditions générales de vente publiées. |
| `SHOP_PRIVACY_URL` | Adresse HTTPS de la politique de confidentialité publiée. |
| `SHOP_SHIPPING_URL` | Adresse HTTPS des informations de livraison publiées. |
| `SHOP_RETURNS_URL` | Adresse HTTPS des informations de retour publiées. |
| `SHOP_LEGAL_URL` | Adresse HTTPS des mentions légales publiées. |
| `SHOP_ENABLED` | `false` par défaut ; `true` pour la recette dans l’environnement de test configuré. Garder la production fermée jusqu’à validation. |

Le mode test Stripe et le mode réel doivent utiliser des variables distinctes. Pour une prévisualisation, `APP_URL` doit désigner cette prévisualisation, sinon la protection d’origine refusera le paiement. Une URL de production connue ne prouve pas que la connexion Vercel sélectionne le bon projet : vérifier l’association du dépôt avant tout déploiement.

Créer un webhook Stripe à l’adresse de cet environnement suivie de `/api/stripe-webhook`, pour `checkout.session.completed` et `checkout.session.async_payment_succeeded`. Une réponse 400 indique une signature invalide ; une réponse 503 doit entraîner une nouvelle tentative de Stripe après correction de la configuration ou de la base. Ne pas désactiver une protection générale de prévisualisation pour contourner un problème d’accès : utiliser une destination de test accessible à Stripe et correctement configurée.

## 5. Recette avant ouverture

Les tests automatisés couvrent le serveur et les règles du panier avec des services simulés. Ils ne remplacent pas un paiement de test dans le compte Stripe marchand.

Une fois l’environnement de test configuré, y définir `SHOP_ENABLED=true` avec les clés Stripe de test, puis redéployer cet environnement. Conserver `SHOP_ENABLED=false` en production pendant cette recette.

- Vérifier l’entrée, le menu, le manga et le passeport sur ordinateur et téléphone.
- Sans produit publié : vérifier « Collection en préparation » et le bouton de paiement désactivé.
- Ajouter un produit de test publié dans Stripe : vérifier son apparition après rechargement sans redéploiement. Le masquer ensuite et vérifier qu’un nouveau paiement contenant l’ancien article est refusé.
- Dans la boutique : choisir une taille et une couleur, ajouter deux articles, modifier une quantité, retirer un article, puis recharger la page.
- Passer au paiement Stripe de test ; vérifier le nom exact des variantes, le montant TTC, la livraison, les conditions de vente et les coordonnées.
- Tester un succès, un refus de carte, une authentification bancaire et un retour volontaire au panier.
- Vérifier qu’un succès produit une ligne privée `shop_orders` et qu’un paiement refusé ne crée pas une commande payée.
- Fermer la page après le paiement de test : le webhook doit quand même enregistrer la commande.
- Rejouer le webhook : une seule commande doit subsister et son éventuel statut `shipped` doit être conservé.
- Vérifier qu’un visiteur ne peut pas lire la table avec la clé publique, et que les secrets sont absents des fichiers de navigateur.

Une fois la recette terminée et les éléments commerciaux confirmés, activer les valeurs de production et `SHOP_ENABLED=true`, puis déployer. Vérifier le bon domaine et la réception des événements.

## Limites explicites de cette première intégration

- Le stock global n’est ni réservé ni décrémenté automatiquement. `max_per_order` limite uniquement une commande. Ajouter une gestion atomique du stock avant d’ouvrir des ventes de séries limitées ; archiver manuellement un prix ne réserve pas les articles déjà présents dans un paiement ouvert.
- L’expédition, les étiquettes transporteur, les remboursements et les retours restent à traiter dans les outils du commerçant. Le statut d’expédition est modifiable dans la table ; aucune interface d’administration n’est créée.
- Les commandes ne sont pas encore reliées au passeport ou à un historique client. Il faut une authentification serveur réelle avant de le faire ; les valeurs `localStorage` ne peuvent pas prouver une identité.
- Les factures, la TVA, les documents légaux et les e-mails marchands doivent correspondre à la situation effective de 3B. Aucun statut fiscal, numéro d’entreprise ou tarif de livraison n’a été inventé.
- La protection contre les abus et la surveillance des erreurs doivent être configurées sur l’hébergement avant ouverture publique du paiement.
- La récupération automatique parcourt jusqu’à 500 produits actifs du compte Stripe, y compris les produits non publiés sur 3B. Au-delà, elle refuse de servir un catalogue partiel ; adapter cette limite avant d’atteindre ce volume.

## Sources techniques

[Stripe Checkout](https://docs.stripe.com/checkout/quickstart) décrit la page de paiement hébergée et le calcul des articles côté serveur. [Les signatures Stripe](https://docs.stripe.com/webhooks/signature) imposent la vérification du corps brut des événements. Les fonctions utilisent le [runtime Node.js de Vercel](https://vercel.com/docs/functions/runtimes/node-js). La protection de la table suit le principe de [Row Level Security de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

La gestion quotidienne utilise le [catalogue de produits Stripe](https://docs.stripe.com/products-prices/manage-prices), la [liste paginée de produits](https://docs.stripe.com/api/products/list) et leurs [métadonnées](https://docs.stripe.com/metadata). La clé `shop_visible` est une règle de publication propre au code 3B, sans effet natif sur les autres usages du compte Stripe.
