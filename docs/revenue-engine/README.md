# Revenue Engine — plan opérationnel

Objectif : construire plusieurs sources de revenus qui peuvent fonctionner en parallèle, avec le moins d'opérations manuelles possible et sans dépendre d'un seul réseau social.

## Architecture

### 1. PWA QuickKit
Produit principal immédiatement exploitable.

- Free : audit PWA public + score + correctifs.
- Pro cible : 9,90 €/mois.
- Paiement : Stripe Checkout hébergé.
- État : UI + API + sécurité SSRF + checkout test + GitHub Action préparés.
- Règle : aucun paiement live avant activation des entitlements, mentions légales et prix live.

État vérifiable du code au 10 octobre 2026 : l'audit gratuit et l'export JSON existent. Le suivi multi-sites et les rapports premium ne sont pas encore livrés par la page QuickKit ; l'offre Pro est donc présentée comme en préparation, même si le serveur possède déjà un checkout et des droits. Le bouton de disponibilité utilise un GET sans transaction. Seule une démo test, clairement identifiée et déclenchée par un second clic, peut être ouverte depuis cette page. Le contrôle backend des paiements réels reste inchangé.

### 2. Produit numérique
Produit futur : PWA Starter Kit Pro.

Contenu prévu :
- manifest prêt à adapter ;
- icônes/checklist ;
- service worker de base ;
- modèle de headers Vercel ;
- guide Android/iPhone ;
- checklist de mise en production.

Prix test cible : 19 € achat unique. Livraison automatique après paiement lorsque le stockage privé et le jeton de téléchargement seront branchés.

La page présente actuellement deux projets de packs (Fix Pack à 9,90 € et React/Vite Starter à 19,90 €). Aucun de ces prix affichés n'a été modifié par cette correction. Le contenu et la livraison des deux packs restent à vérifier : leurs liens servent uniquement à demander d'être prévenu, sans réservation commerciale, commande ou débit. Le prix cible historique de 19 € ci-dessus ne constitue pas un tarif d'achat ouvert.

### 3. GitHub funnel
Action réutilisable `PWA QuickKit Audit` ajoutée dans `.github/actions/pwa-quickkit`.

But :
- faire découvrir QuickKit aux développeurs ;
- produire un score dans GitHub Actions ;
- envoyer vers le produit web ;
- construire de l'adoption avant une éventuelle GitHub App / Marketplace.

### 4. Bounties / primes
Veille quotidienne automatisée activée.

Filtre :
- issue rémunérée claire ;
- source officielle ;
- pas de paiement initial douteux ;
- travail compatible IA / code ;
- récompense et deadline vérifiables.

Avant de réclamer une bounty : lire les règles, vérifier qu'elle n'est pas déjà assignée, produire un correctif isolé, tests + PR propre.

### 5. Affiliation sans TikTok
Page SEO `/outils-ia/` créée.

Au départ, les liens Descript et Lovable restent officiels et non affiliés. Dès acceptation des candidatures, remplacer uniquement les URLs par les liens personnels et mettre à jour la mention de transparence.

### 6. GitHub Sponsors
À activer plus tard quand le dépôt aura une audience réelle et une partie clairement open source utile hors 3B.

Prérequis côté propriétaire : identité, 2FA, fiscalité/payout. Ne pas compter dessus comme revenu immédiat.

## Priorité mathématique

On optimise le ratio :

`Valeur attendue = trafic qualifié × taux de conversion × panier moyen × marge - coût de maintenance`

Ordre choisi :
1. QuickKit Free → trafic et preuve de valeur.
2. QuickKit Pro → revenu récurrent.
3. Affiliation SEO → revenu sans produit supplémentaire.
4. Produit numérique → revenu ponctuel automatisable.
5. GitHub Action → acquisition développeurs.
6. Bounties → revenu opportuniste.
7. Sponsors / Marketplace → après traction.

## Garde-fous

- zéro faux clic, faux compte, faux achat ou trafic manipulé ;
- aucun scraping agressif ni contournement de conditions ;
- paiements live bloqués tant que livraison/droits ne sont pas fiables ;
- secrets uniquement en variables d'environnement ;
- branches de travail séparées de `main` ;
- tests avant fusion.
