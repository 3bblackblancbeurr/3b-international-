# Le Cercle 3B

Programme gratuit relié à un compte Supabase Auth. Les jeux sont également accessibles en invité. Configuration des niveaux et avantages : `shared/loyalty.js`.

- Jeux intégrés : 10 XP / 30 secondes actives, 1 point / minute ; plafonds journaliers de 600 XP et 20 points, heure de Paris. Horloge serveur, requêtes séquencées et un seul jeu actif par compte. Les longues interruptions ne sont pas créditées. Les scores et fichiers importés ne donnent aucun point de fidélité.
- Visites du passeport, du manga et du monde : 20 XP / 2 points une fois par section. Bonus à réclamer : 10 XP / 2 points par jour.
- Achats : 10 XP et 10 points par euro de marchandises payé après réduction, hors livraison (calcul en centimes, arrondi inférieur). Solde cumulatif, sans dépense de points. 1 000 / 3 000 / 7 000 points donnent 5 / 8 / 10 % sur les articles, meilleur taux uniquement, fixé à l'ouverture de Checkout.
- Designs à 0 / 300 / 1 500 / 5 000 / 12 000 XP, carte SVG nominative et aura correspondante dans les Ombres et le Labyrinthe. Aucun avantage de combat payant.

## Compte et protection des données

Identifiant public de 3 à 24 caractères, mot de passe de 12 à 128 caractères, nom affiché et pays 3B. L'adresse interne `u.<identifiant>@accounts.3b.invalid` sert uniquement d'identifiant Supabase : ce n'est pas une adresse de contact vérifiée et aucun message ne lui est envoyé. Une clé aléatoire de récupération de 256 bits est remise une fois au membre ; seul son hachage SHA-256 est conservé. La récupération la fait tourner et révoque les anciennes sessions.

`member-hub` authentifie chaque action privée via Auth et une session encore active. Son point d'entrée public est nécessaire pour l'inscription et la récupération, toutes deux limitées en fréquence. Clés de service uniquement dans les environnements serveur. Le navigateur utilise une clé publiable. Aucun secret dans les snapshots ou journaux d'erreurs.

Profils et historique en lecture seule pour leur propriétaire ; sauvegardes limitées à leur compte par RLS. Les RPC de crédit, remboursements, sessions et limites ne sont exécutables que par le serveur. Les soldes sont modifiés transactionnellement avec des événements uniques. Les tables de traitement sans politique RLS sont volontairement inaccessibles aux clients.

Les récompenses d'exploration et le temps actif sont des engagements légers, plafonnés ; ils ne constituent pas un système anti-triche compétitif. Les achats sont exclusivement validés avec les données Stripe reçues côté serveur.

## Déploiement

Migrations déjà appliquées au projet `ttvhcezucsbbmnafrotq`, dans cet ordre :

1. `supabase/loyalty.sql`
2. `supabase/shop-orders.sql` (si la boutique n'est pas encore provisionnée)
3. `supabase/loyalty-session-security.sql`
4. `supabase/loyalty-purchase-settlement.sql`

La fonction Edge `member-hub` est déployée en copiant `supabase/functions/member-hub/index.ts` vers `index.ts` et `shared/loyalty.js` vers `loyalty.js` dans le même paquet. `verify_jwt=false` car l'authentification est explicitement effectuée dans la fonction ; ne pas supprimer ce contrôle interne. Les variables Supabase sont fournies par l'environnement Edge. Origines autorisées : production 3B et développement local sur les ports 5174, 5186 et 5187 (origines exactes définies dans la fonction).

Le frontend Vite utilise `npm ci`, `npm test`, `npm run build`. Aucun mot de passe ni compte de test n'est livré dans le dépôt.

## Boutique : raccordement à l'ouverture des ventes

Au 10 septembre 2026, le catalogue public est vide et désactivé. Le compte Stripe 3B ne possède aucun webhook enregistré. Les ventes n'ont pas été activées ni des produits inventés. Le déploiement du calcul d'achat ne constitue donc pas une validation d'un achat réel.

Lors de la configuration de la boutique (voir `docs/ACTIVATION-PAIEMENT.md`), ajouter le webhook HTTPS `/api/stripe-webhook` pour `checkout.session.completed`, `checkout.session.async_payment_succeeded` et `charge.refunded`, puis installer son secret dans `STRIPE_WEBHOOK_SECRET` sur Vercel. Renseigner également `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` côté serveur, et les paramètres Stripe, livraison et conditions exigés par `server/shop.js`.

La session Checkout reçoit uniquement l'UID vérifié par le serveur. Les coupons 5/8/10 % sont créés à la demande avec des identifiants idempotents. Le webhook relit le paiement, crédite une seule fois et ignore le mode test. Les remboursements sont répartis proportionnellement entre marchandises et livraison puis retirés du solde. Un remboursement reçu avant la confirmation est déjà déduit du crédit initial. Les retries n'ajoutent pas de crédit. Tester le parcours Checkout et les trois événements en environnement de test avant d'ouvrir de vraies ventes.

## Vérifications effectuées

Tests Node : seuils et règles, connexion et remises côté serveur, paiements et remboursements signés, protections de la boutique, cinq jeux et contrôles tactiles. Tests sur Supabase réel avec comptes éphémères : isolation RLS, interdiction d'écriture directe du solde, unicité du bonus, plafonds, récupération et révocation de session. Les calculs transactionnels d'achat, arrondis, doublons et remboursements ont été vérifiés dans une transaction annulée.
