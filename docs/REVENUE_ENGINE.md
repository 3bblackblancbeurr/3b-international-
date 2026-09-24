# Revenue Engine — plan d'exécution

## Objectif
Construire des actifs numériques qui peuvent produire des revenus sans dépendre d'un seul réseau social. Aucun revenu n'est garanti : chaque canal dépend d'utilisateurs, de trafic, d'une validation de plateforme ou d'un client payant.

## 1. PWA QuickKit — produit principal
- Statut : MVP premium codé.
- URL prévue : `/pwa-quickkit/` après fusion/déploiement.
- Gratuit : audit PWA/mobile/sécurité/performance + export JSON.
- Pro préparé : 14,90 € paiement unique.
- Pro livrable cible : rapport premium, manifest conseillé, headers, checklist Android/iPhone et plan de correction.
- Sécurité : protection SSRF, limite de taille, timeout, redirections contrôlées, aucune URL conservée par le code d'audit.

### Métriques de décision
- Activation = audits terminés / visites.
- Intention Pro = clics Pro / audits terminés.
- Conversion = achats / clics Pro.
- Revenu par visite = CA / visites.
- Seuil d'itération : ne pas complexifier le produit avant d'avoir au moins 30 audits réels et des retours utilisateurs.

## 2. Produits numériques dérivés
Ordre recommandé :
1. PWA Fix Pack — 9,90 € : modèles manifest, headers, checklists.
2. PWA QuickKit Pro — 14,90 € : génération guidée personnalisée.
3. Starter PWA React/Vite — 19,90 € : template propre et documenté.

Un produit n'est publié que lorsque la livraison et le paiement sont testés de bout en bout.

## 3. Micro-SaaS
Ne pas créer un second backend avant validation du besoin. Le SaaS ne démarre que si au moins un signal existe : ventes du Fix Pack, demandes récurrentes ou usage répété.

Candidat : surveillance quotidienne d'une URL avec alerte lors d'une régression PWA.
Prix test : 5–9 €/mois/site.

## 4. GitHub Marketplace
Produit candidat : GitHub App « PWA QuickCheck ».
Déclencheur : pull request ou déploiement -> audit automatique -> commentaire avec score et régressions.

Avant Marketplace payant : obtenir d'abord des installations réelles, une documentation publique et un support minimal. Ne pas dépendre du Marketplace pour le revenu court terme.

## 5. Bounties GitHub / concours / affiliation
Une veille quotidienne externe est séparée du code produit. Filtres : source officielle, rémunération vérifiable, absence de paiement initial douteux, travail légal, deadline réaliste, pas de faux trafic/spam/manipulation.

## 6. Site d'affiliation sans TikTok
Créer des pages utiles et comparatives uniquement après réception des liens affiliés personnels. Ne jamais publier de lien inventé. Chaque page doit afficher une mention d'affiliation claire.

Pages prévues :
- `/outils-ia/` — hub éditorial.
- `/outils-ia/descript/` — tutoriel et cas d'usage.
- `/outils-ia/lovable/` — idée -> application.
- `/outils-ia/comparatif-creation/` — comparaison factuelle par usage.

## 7. Règles anti-fragilité
- Pas de faux clics, faux comptes ou achats simulés.
- Pas de scraping agressif ou contournement des règles d'une plateforme.
- Pas de dépenses publicitaires automatiques sans plafond explicite validé.
- Pas de dépendance à une seule plateforme.
- Chaque actif doit avoir une mesure simple : trafic, activation, conversion, revenu.
