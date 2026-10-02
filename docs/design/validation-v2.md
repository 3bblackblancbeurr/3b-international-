# Vérification — Luxury Digital Universe V2

Base : `4f121e0efee8487c1e9a46760db9f3860030761f` (main, snapshot compte/Passeport/économie).

- Suite globale du dépôt : **1 385 PASS, 0 FAIL, 1 SKIP** sur 1 386 tests. Le test ignoré nécessite Swift, absent de cet environnement Linux.
- Recette ciblée finale : **92 PASS** (politique de mouvement, Passeport, accès, ville, responsive, Gold Master et directeur cinématique).
- Compilation Vite : **PASS**. Avertissement existant sur les gros bundles Three.js/jeu; l’aperçu reste chargé à la demande.
- Brand Vault : **PASS**, avec le statut de bootstrap existant « 9 official logo slots pending ». Aucun logo officiel n’a été modifié.
- Contrôle navigateur local : mobile 390 × 844 et 360 × 800, bureau 1440 × 1000, profil synthétique; **19 assertions PASS, 0 erreur JavaScript non gérée** lors de la recette complète. Recette finale isolée accès/introduction : **7 assertions PASS**, dont le portail invité sans reprise de l’intro, et 0 erreur JavaScript non gérée.
- Deux reprises sur Chromium avec rendu graphique logiciel ont atteint un délai de capture ou de stabilité visuelle. Les captures validées sont conservées; le script permet une exécution sans capture et une vérification isolée des accès.
- Le contrôle visuel a révélé la règle historique `88px 1fr` qui comprimait le showroom mobile. Le produit occupe désormais une colonne pleine largeur, vérifiée par une assertion de largeur.

Les parcours vérifiés couvrent : aperçu WebGL et sélection France, affichage du Passeport actif sans bouton/lien, ses 58 colonnes Matrix, le mode mouvement réduit, le showroom et ses détails, ouverture/fermeture du zoom avec restauration du défilement, verrou du Secret, entrée ville depuis l’accueil, ouverture initiale passée et retour rapide.

Les API distantes sont simulées et interceptées dans la recette; aucun paiement, compte réel, gain, identité vérifiée ou secret n’est créé. Les tests ne constituent pas une validation de Stripe, IDnow, des webhooks, de la production Vercel ou de toutes les performances sur Samsung réel.

## Complément artistique V2.1

- Recette locale art, Passeport, boutique et responsive : **69 tests réussis**, sans échec.
- Nouvelle recette navigateur complète avec les médias HD : **20 assertions réussies**, aucune erreur JavaScript non gérée. L’inspection visuelle a ensuite détecté un conteneur de cadrage nul sur mobile, corrigé avec une colonne de grille explicite; une vérification spécifique de la taille et du décodage du vêtement complète les assertions fonctionnelles.
- Atlas exporté en GLB : **2 511 624 octets**, huit quartiers, **72 maillages / 54 920 triangles** de géométrie statique. Géométries finies, budgets et libération des ressources vérifiés.
- Recette artistique finale après correction : **5 assertions réussies**, aucune erreur JavaScript ou shader; **80 appels de rendu / 62 128 triangles** mesurés avec l’eau et les habitants. Noir et blanc décodés en HD; le retour au panorama détruit le canvas WebGL.
- PR GitHub **#393** ouverte. Les sept workflows de la première version publiée (`e8c1330`) ont réussi : mobile, City, Metropolis, monde/application, sécurité, boutique et Gold Master. Les résultats du dernier commit doivent être vérifiés séparément.

La recette ciblée des nouveaux médias et shaders se lance avec `LUXURY_QA_ART_ONLY=1`. Elle vérifie la présence réelle du vêtement, le décodage HD, la lumière du modèle blanc, le budget de rendu et la destruction du contexte à la fermeture de l’atlas.

## Rejouer

```sh
npm ci
npm run build
node --test tests/luxury-experience.test.js tests/city3b.test.js tests/passport-appearance.test.js tests/responsive-contract.test.js tests/nosbloc.test.js tests/passport-access-gate.test.js tests/gold-master-*.test.js tests/world-gold-master-cinematics.test.js tests/cinematics-gold-master.test.js
```

Avec Playwright et Chromium disponibles :

```sh
PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs CHROMIUM_PATH=/chemin/vers/chromium node scripts/verify-luxury-browser.mjs
```

Les captures et le détail JSON sont écrits dans `LUXURY_QA_OUTPUT` (par défaut `/tmp/3b-luxury-qa`).

Ajouter `LUXURY_QA_SCREENSHOTS=0` pour vérifier les interactions sans refaire les captures, ou `LUXURY_QA_ACCESS_ONLY=1` pour les seuls contrôles d’accès et d’introduction.
