# Revenue Engine — plan d'exécution

## Objectif
Construire plusieurs actifs numériques capables de produire du revenu sans dépendre d'un seul réseau social. Aucun revenu n'est garanti : chaque canal dépend de clients, de trafic, d'une validation de plateforme ou d'un paiement réellement disponible.

## 1. PWA QuickKit — acquisition gratuite + conversion
- Statut : audit gratuit codé et déjà intégré.
- URL : `/pwa-quickkit/`.
- Free : audit PWA/mobile/sécurité/performance + export JSON.
- Pro préparé : **9,90 €/mois**.
- Checkout réel : **fail-closed** tant que Stripe Live, webhook Live et informations marchandes ne sont pas validés.
- Sécurité : protection SSRF, limite de taille, timeout, redirections contrôlées, aucune URL conservée par le code d'audit.

### Conversion avant Stripe Live
La page propose désormais deux services qui peuvent générer un lead immédiatement, sans ouvrir un faux checkout :
1. **Quick Fix — dès 49 €** : interprétation du rapport, snippets prêts à intégrer, manifest/icônes/headers/checklist et contrôle après correction.
2. **Fix + intégration — dès 99 €** : avec accès GitHub fourni par le client, branche dédiée, patch, tests et Pull Request.

Le périmètre doit toujours être confirmé avant facturation. Aucun accès de production ne doit être demandé par e-mail.

### Métriques de décision
- Activation = audits terminés / visites.
- Intention service = clics Correction Express / audits terminés.
- Intention Pro = clics Pro / audits terminés.
- Conversion = ventes / leads.
- Revenu par visite = CA / visites.
- Seuil d'itération : ne pas complexifier le SaaS avant d'avoir des audits réels, des leads ou des ventes.

## 2. Produits numériques dérivés
Ordre :
1. **PWA Fix Pack — 9,90 €** : modèles manifest, headers et checklists.
2. **PWA QuickKit Pro — 9,90 €/mois** : suivi, rapports premium et assistance guidée.
3. **Starter PWA React/Vite — 19,90 €** : template propre et documenté.

Un produit payant n'est publié que lorsque la livraison et le paiement sont testés de bout en bout.

## 3. Service productisé
But : gagner de l'argent avant d'avoir assez de trafic pour un SaaS.

Workflow cible :
1. Audit gratuit.
2. CTA Correction Express.
3. E-mail prérempli avec URL + score + priorités.
4. Qualification rapide.
5. Prix/périmètre confirmé.
6. Paiement/invoice via rail marchand réellement actif.
7. Livraison patch/snippets/PR.
8. Audit de contrôle.

Le service doit rester limité et standardisé pour éviter de transformer chaque vente en refonte complète.

## 4. Micro-SaaS
Ne pas créer un second backend avant validation du besoin. Le SaaS ne démarre que si au moins un signal existe : ventes du Fix Pack, demandes récurrentes ou usage répété.

Candidat : surveillance quotidienne d'une URL avec alerte lors d'une régression PWA.
Prix test : 5–9 €/mois/site.

## 5. GitHub comme canal d'acquisition
- Action réutilisable PWA QuickKit déjà préparée.
- Candidat futur : GitHub App « PWA QuickCheck ».
- Déclencheur : Pull Request ou déploiement → audit automatique → commentaire score/régressions.
- Avant Marketplace payant : obtenir des installations réelles, une documentation publique et un support minimal.

## 6. Affiliations
### Déjà engagées
- Descript : candidature PartnerStack déposée.
- Lovable : candidature via impact.com engagée.
- ElevenLabs : prise de contact affiliate envoyée.

### Cibles compatibles avec les rails déjà ouverts
- InVideo : programme officiel géré par impact.com.
- CapCut : programme officiel géré par impact.com.
- Runway : programme d'affiliation public, demande séparée.
- Autres programmes : uniquement après vérification de la source officielle, du paiement, du pays et des règles anti-spam.

Règles :
- Aucun faux clic, auto-clic, cookie stuffing ou achat artificiel.
- Ne jamais inventer un lien affilié.
- Disclosure visible dès qu'un lien devient rémunéré.
- Les comparatifs doivent rester factuels et réellement utiles.

## 7. Site d'affiliation / SEO
Hub existant : `/outils-ia/`.

Pages à produire en priorité après obtention d'un lien personnel :
- `/outils-ia/descript/`
- `/outils-ia/lovable/`
- `/outils-ia/elevenlabs/`
- `/outils-ia/invideo/`
- `/outils-ia/capcut/`
- `/outils-ia/comparatif-creation/`

Les pages peuvent exister avec des liens officiels non affiliés avant acceptation, mais ne doivent jamais faire croire qu'une commission est déjà active.

## 8. Bounties / concours
Filtre permanent :
- source officielle ;
- rémunération vérifiable ;
- issue/défi encore ouvert ;
- concurrence raisonnable ;
- aucune dépense initiale douteuse ;
- travail légal ;
- IA/automatisation compatible avec les règles.

Éviter les bounties faibles déjà saturés de dizaines de claims : l'EV horaire y devient mauvais.

## 9. Rails de paiement
Priorité :
1. Stripe Live pour QuickKit et 3B.
2. Hyperwallet/Fab si vérification débloquée.
3. impact.com et PartnerStack pour affiliations.
4. Payouts propres aux marketplaces (Gumroad, Adobe Stock, etc.) après KYC/payout réel.

Aucun solde test n'est du revenu.

## 10. Règles anti-fragilité
- Pas de faux clics, faux comptes ou achats simulés.
- Pas de scraping agressif ou contournement des règles d'une plateforme.
- Pas de dépenses publicitaires automatiques sans plafond explicite validé.
- Pas de dépendance à une seule plateforme.
- Chaque actif doit avoir une mesure simple : trafic, activation, lead, conversion, revenu.
- Priorité au revenu direct et aux sommes récupérables avant les projets longs.
