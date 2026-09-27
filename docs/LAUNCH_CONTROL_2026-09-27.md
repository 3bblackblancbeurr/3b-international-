# 3B LAUNCH CONTROL — 27 septembre 2026

Ce document sert de source de vérité pour préparer 3B à une bêta publique puis, plus tard, à l'encaissement réel. Il sépare ce qui est techniquement vérifié de ce qui exige l'identité ou une décision du fondateur.

## 1. État vérifié

### GitHub / déploiement
- Dépôt canonique : `3bblackblancbeurr/3b-international-`.
- Branche de production : `main`.
- Le commit de production contrôlé le 27/09/2026 contient la protection Passeport qui sépare l'identifiant public de l'UUID Auth.
- Le statut Vercel associé au commit contrôlé est réussi.
- Les déploiements automatiques Vercel sont configurés pour `main`, pas pour toutes les branches.

### Supabase
- Projet principal `3b discuter` : actif et sain.
- Projet `3B Nosbloc Staging` : actif et sain.
- Les tables signalées « RLS enabled, no policy » sur le projet principal n'accordent actuellement aucun accès table direct à `anon` ou `authenticated` : elles restent fermées par défaut.
- Les vues publiques inspectées utilisent `security_invoker=true`.
- Les fonctions `SECURITY DEFINER` sensibles inspectées utilisent un `search_path` verrouillé et des contrôles d'identité/session/rate-limit adaptés à leur rôle.
- Ce contrôle ne remplace pas un pentest externe complet.

### Stripe test
- Le compte Stripe accessible est un environnement de test, pas Live.
- Un webhook test est actif vers `https://3b-international.vercel.app/api/stripe-webhook`.
- Aucun Checkout Session n'était présent lors du contrôle : aucun E2E réel n'est encore prouvé.
- Le webhook est actuellement abonné aux succès Checkout ; il doit aussi recevoir les événements nécessaires au remboursement réellement utilisé par le backend.
- Le catalogue Stripe test visible ne correspond pas à l'ancienne checklist « 80 € / 16 variantes » : le Pull TEST visible est encore à 200 € et les variantes annoncées ne sont pas toutes présentes.
- Aucun changement de prix n'est automatique : le prix final est une décision commerciale du fondateur.

### Juridique / confidentialité
- `legal-notice.html` est encore explicitement une page de pré-ouverture.
- `shipping.html` et `returns.html` sont également en pré-ouverture.
- La politique de confidentialité existe mais doit encore être finalisée avec l'identité du responsable, bases légales, durées, prestataires/transferts, modalités d'exercice des droits et autres éléments adaptés au fonctionnement réel.
- La boutique réelle doit rester fermée tant que l'identité/statut/adresse professionnelle et les documents de vente ne sont pas finalisés.

## 2. Verrous avant ARGENT RÉEL

Tous les points suivants doivent être verts :

1. Structure juridique/immatriculation décidée et créée.
2. Coordonnées professionnelles publiques décidées.
3. Compte bancaire/compte de paiement de l'activité prêt.
4. Stripe Live ouvert et KYC validé, mais laissé désactivé côté 3B jusqu'au go-live.
5. Prix, produits, stocks/production, livraison et politique de retours décidés.
6. Mentions légales + CGV + confidentialité/RGPD + médiateur + informations fiscales finalisés.
7. Politique mineurs/âge/consentements décidée pour les zones communautaires.
8. Secrets production installés dans les services concernés sans être committés dans Git.
9. Test Stripe E2E en mode test réussi depuis la vraie URL de production.
10. Test remboursement réussi et webhook reçu.
11. Test compte A / compte B prouvant l'absence de fuite de commande ou d'identité.
12. Sauvegarde/restauration Supabase et procédure incident vérifiées.
13. Audit dépendances, secrets, RLS/RPC/Edge Functions et CI de release verts.
14. `SHOP_RELEASE_APPROVED=true` uniquement au moment du lancement validé.
15. Paiements/payouts Nosbloc restent séparément bloqués tant que Connect/KYC/fiscalité marketplace ne sont pas validés.

## 3. Ce que l'assistant peut prendre en charge

- Auditer GitHub, Supabase et Stripe test.
- Préparer/corriger le code, les tests et les release gates via PR.
- Vérifier RLS, RPC, vues, migrations et règles d'accès sans ajouter de permissions au hasard.
- Préparer les modèles de mentions légales, CGV, politique de confidentialité, registre RGPD et checklist incident.
- Tester le circuit Stripe test lorsque les variables nécessaires sont installées.
- Vérifier le webhook et la cohérence catalogue/prix après décision commerciale.
- Préparer la recette bêta et les tests multi-comptes/mobile.
- Maintenir cette checklist comme source de vérité.

## 4. Ce qui nécessite obligatoirement le fondateur

L'assistant ne doit jamais inventer ces informations :
- identité/raison sociale exacte ;
- forme juridique choisie ;
- SIREN/SIRET/RNE/TVA lorsqu'ils existent ;
- adresse professionnelle publiée ;
- coordonnées bancaires ;
- validation KYC Stripe ;
- adhésion et coordonnées du médiateur de la consommation ;
- choix fiscal/comptable ;
- prix commercial définitif ;
- adresse de retour et règles commerciales définitives ;
- politique d'âge/mineurs ;
- approbation finale d'ouverture des paiements.

Le fondateur n'a pas besoin de coder : il doit uniquement fournir/valider ces décisions et documents lorsqu'ils sont obtenus.

## 5. Règle fail-closed

En cas de doute, de configuration manquante ou de divergence entre documentation et services réels : **la boutique et les versements restent fermés**. La bêta gratuite peut continuer séparément si les fonctions exposées sont sûres.
