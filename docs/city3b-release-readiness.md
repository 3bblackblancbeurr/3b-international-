# Créer ma Ville — état de la finition

## Disponible dans cette livraison

- Campagne de 72 missions, 100 niveaux et trois sauvegardes indépendantes.
- 23 rendez-vous persistants, dont 12 dossiers municipaux supplémentaires du niveau 15 au niveau 100. Les objectifs portent sur la couverture des besoins, les emplois, la mobilité et le bien-être pendant plusieurs cycles. Les anciens rendez-vous et leurs récompenses sont conservés.
- Portraits illustrés des conseillers, journal fondé sur les besoins et événements réels, accès direct aux objectifs et aux services concernés.
- Adaptation du rendu après deux fenêtres de ralentissement durable ; suspension en arrière-plan ; relance de la 3D après perte du contexte graphique.
- Reprise des actions sans confirmation : référence et contenu conservés par compte et sauvegarde, vérification du serveur, nouvelle tentative explicite. Les écritures ne sont jamais répétées automatiquement. Une ancienne réponse ne peut pas remplacer la ville après fermeture et réouverture.
- Installation web iPhone sans invitation, accès public Safari et redirection d’installation selon l’appareil.
- Paiements web en test : confirmation serveur, remboursement proportionnel des crédits, historique comptable cumulatif et remboursement idempotent d’un second paiement du même objet permanent.

## Validation avant ouverture des paiements réels

Les gates de paiement réel et d’achat natif restent fermées. Le catalogue et les identifiants produit ne constituent pas une intégration d’achat Apple/Google terminée.

1. Configurer les produits et les contrats commerciaux dans App Store Connect et Google Play Console, avec les identifiants correspondant au catalogue.
2. Intégrer le module d’achat natif Capacitor et la validation serveur des reçus/transactions ; les clés et comptes de boutiques ne sont pas fournis dans le dépôt. Aucun fallback Stripe n’est autorisé dans l’application native pour ces biens numériques.
3. Vérifier en sandbox achat réussi, annulation, paiement en attente, restauration, changement de compte, achat répété d’un objet permanent, remboursements, événements répétés et événements reçus dans le désordre. Les consommables ne doivent être crédités qu’une fois par transaction validée.
4. Vérifier les prix affichés par la boutique, les textes, l’historique et la récupération après perte réseau à chaque étape.
5. Ouvrir le paiement réel uniquement après validation de ces parcours et des boutiques.

## Recette humaine encore nécessaire

Une compilation et des tests automatiques ne constituent pas une certification AAA ni une mesure sur un Samsung physique. Vérifier une ville dense sur le téléphone cible : précision du tracé, panneaux, bâtiments, rotation, clavier, veille/reprise, perte de connexion et session prolongée. Mesurer le rythme des niveaux sur une longue partie humaine et ajuster les coûts/récompenses si nécessaire. La lecture vocale reste celle du navigateur ; il ne s’agit pas d’un doublage professionnel enregistré.
