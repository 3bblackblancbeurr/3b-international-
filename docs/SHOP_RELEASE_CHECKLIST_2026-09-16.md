# Checklist boutique 3B — état vérifié au 27 septembre 2026

## Déjà en place

- [x] Visuels et parcours boutique présents.
- [x] Livraison France incluse prise en charge côté serveur.
- [x] Paiement hébergé Stripe Checkout et webhook conservés.
- [x] Workflow vendeur : attente → prise en charge → expédiée.
- [x] Délai prise en charge maximum : 5 jours.
- [x] Délai d’expédition après prise en charge : 2 jours.
- [x] Suivi client sans exposition des données privées d’un autre client.
- [x] Accès vendeur isolé côté serveur via la table privée `shop_staff` ; la modération `community_staff` n’accorde aucun accès boutique.
- [x] Stockage de commande Supabase préparé.
- [x] Stripe relié à ChatGPT est uniquement un environnement de test.
- [x] Webhook test actif vers `/api/stripe-webhook`.
- [x] Le backend refuse le checkout quand la configuration obligatoire est incomplète.
- [x] Le checkout ignore prix, identité et redirections fournis par le client.
- [x] Signature webhook, idempotence, statut payé et origine sont vérifiés côté serveur.

## Écarts constatés pendant l’audit du 27/09/2026

- [ ] Le prix Stripe test doit être réaligné avec la décision commerciale finale. Le prix actif du Pull TEST visible au moment de l’audit est encore de 200 €, et non 80 €.
- [ ] Les 16 variantes annoncées historiquement ne sont pas présentes dans le catalogue Stripe test actuellement visible.
- [ ] Aucune Checkout Session n’est enregistrée dans le compte Stripe test au moment de l’audit : le paiement E2E n’est donc pas encore démontré.
- [x] Webhook test aligné le 27/09/2026 : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` et `charge.refunded`.
- [ ] Les secrets/configurations boutique Vercel doivent être contrôlés sans jamais exposer leurs valeurs.
- [ ] Après déploiement de la migration, ajouter explicitement dans `shop_staff` uniquement les UUID des vendeurs autorisés ; aucun modérateur n’est migré automatiquement.
- [ ] Le paiement test doit être exécuté de bout en bout depuis le déploiement public : création Checkout → paiement carte test → webhook → `shop_orders` → confirmation → remboursement test.
- [ ] Les mentions légales vendeur définitives doivent remplacer l’état « pré-ouverture ».
- [ ] Les CGV, retours, livraison, médiateur, confidentialité/RGPD et informations fiscales doivent être validés pour l’activité réelle.
- [ ] Stripe Live reste interdit tant que tous les verrous précédents ne sont pas levés.

## Verrous techniques supplémentaires proposés

La branche `security/3b-launch-gates-20260927` ajoute une défense en profondeur :

- `SHOP_RELEASE_APPROVED=true` est exigé en plus de `SHOP_ENABLED=true`.
- Une clé Stripe Live exige aussi `SHOP_LIVE_APPROVED=true`. Laisser ce verrou à `false` pendant toute la validation test.
- `SHOP_CHECKOUT_COOKIE_SECRET` doit être un secret séparé d’au moins 32 caractères ; la clé Stripe n’est plus réutilisée pour signer le cookie de confirmation.
- `SHOP_AUTOMATIC_TAX=true` ne peut ouvrir la boutique que si `SHOP_TAX_REGISTRATION_CONFIRMED=true`.
- Ces valeurs sont des drapeaux/variables de configuration ; aucune valeur secrète ne doit être committée dans Git.

## Règle de lancement

**Aucun paiement réel et aucun versement créateur tant que la structure juridique, l’identité vendeur, la fiscalité, le compte de paiement, les CGV/RGPD et le test E2E ne sont pas validés.**
