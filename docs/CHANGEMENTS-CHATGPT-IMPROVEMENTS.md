# 3B International — reprise de la mise à jour

Branche : `chatgpt-improvements`, créée depuis `main` au commit `e49195ef95586119f702569480d5ae7454c30d25`.

## Changements préparés

- Reprise des deux commits boutique précédemment préparés. Catalogue vide par défaut (« Collection en préparation »), produits et variantes gérés depuis Stripe, panier persistant et paiement fermé tant que la configuration commerciale n’est pas complète.
- Préparation du paiement Stripe Checkout : validation serveur des prix et quantités, contrôle de l’origine, idempotence, confirmation liée au navigateur et webhook signé. Les moyens de paiement sont désormais sélectionnés depuis Stripe, sans restriction codée à la carte bancaire. L’identifiant d’intégration reste stable lors des nouvelles tentatives.
- Deux cases dans l’espace IA : **IA textile** et **Mode 3 IA**. L’atelier permet de préparer et copier un brief textile. La génération d’images et les appels à GPT, Claude et Gemini sont explicitement annoncés comme futurs ; aucun appel IA ni aucune réponse simulée n’est ajouté.
- Mise en avant de **3B ORIGINS — Tome 0 : Le Cercle Brisé**, avec Kaïs, le loup, les huit portes, les huit gardiens, les clés et le Monstre de l’Oubli. Le tome reste en préparation ; aucune planche ou lecture fictive n’est proposée. Aucun passeport n’est ajouté au scénario du manga.
- Le bouton d’activation du passeport ouvre le formulaire. Nom, e-mail et pays sont validés avant activation. Les identifiants et la progression des profils existants sont conservés ; les données locales mal formées ne provoquent pas d’écran blanc.
- L’espace membre indique que le profil reste enregistré sur cet appareil. La véritable authentification serveur et la vérification d’e-mail ne sont pas implémentées dans cette reprise. Les données du passeport ne donnent aucun droit sur les commandes.
- Confirmation avant la remise à zéro du profil. Réglages traduits et reliés aux effets Matrix, animations, reflets et réduction des mouvements.
- Adresses distinctes pour les rubriques, rechargement et historique du navigateur. Les retours Stripe atteignent la boutique même sans fragment d’URL. Navigation au clavier, focus des titres, retours d’erreur du coffre, libellés et tailles de boutons améliorés.
- Lisibilité mobile renforcée ; les styles de la page d’entrée et le reflet BLACK • BLANC • BEUR sont conservés. Les versions des dépendances sont fixées aux versions déjà présentes dans le fichier de verrouillage.

## Vérifications réalisées

- Build de production Vite : réussi, avec la commande locale `node node_modules/vite/bin/vite.js build` (équivalent au script `npm run build`).
- Tests : **32 réussis**, avec `node --test tests/*.test.js` (script `npm test`). Les 24 tests boutique couvrent notamment les manipulations du panier, les faux retours de paiement, les signatures, la persistance et les changements de catalogue ; huit tests couvrent les profils et le routage.
- Rendu statique des **16 routes** React : réussi, sans erreur de rendu. Ce contrôle ne simule pas les interactions ni les dimensions d’un téléphone.
- `git diff --check` : réussi.
- L’aperçu Vite a démarré sur une adresse locale, mais le navigateur de vérification refuse son ouverture (`net::ERR_BLOCKED_BY_CLIENT`). La recette visuelle et interactive, notamment mobile, reste à effectuer dans un aperçu accessible.
- Aucun appel marchand réel, paiement, création de produit, migration Supabase ou raccordement IA n’a été exécuté. La recette Stripe avec les véritables services en mode test reste à réaliser avant ouverture des ventes.

## État de publication

Le premier envoi avait été bloqué par une réponse GitHub **403 — Resource not accessible by integration**. Après installation de ChatGPT Codex Connector sur le compte `3bblackblancbeurr`, la création de la branche distante `chatgpt-improvements` a réussi.

Les changements sont proposés sur cette branche pour une Pull Request en brouillon vers `main`, avec le texte de `PULL_REQUEST.md`. Les vérifications visuelles et le raccordement des services décrits ci-dessus restent nécessaires. Aucune fusion ni mise en production Vercel n’est effectuée dans cette reprise. Le `main` distant a été relu et reste au commit de départ.

Attendre la validation du propriétaire avant fusion ou production.

Les guides `ACTIVATION-PAIEMENT.md` et `AJOUTER-MES-VETEMENTS.md` détaillent les prérequis pour les futures ventes. Le document `AUDIT-3B-2026-09-08.md` décrit l’audit historique et ne représente pas l’état des correctifs de cette reprise.

Références de l’ajustement Stripe : [création de session Checkout](https://docs.stripe.com/api/checkout/sessions/create) et [moyens de paiement dynamiques](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods).
