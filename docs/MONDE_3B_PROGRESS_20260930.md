# Monde 3B — progression locale du 30 septembre 2026

Ces changements sont préparés dans la copie locale du main. Ce document ne confirme ni publication, ni migration en production, ni livraison Unreal, ni certification sur appareils réels.

## Ce qui est branché

- Les dix quartiers disposent d’un répertoire dans « La vie de la Cité » et l’Atlas. Les repères guident le joueur vers les habitants, les bâtiments et les missions ; ils n’enregistrent pas des visites à distance.
- Les dix-neuf bâtiments ouvrent un panneau dédié avec des services réellement disponibles. Cinq ateliers permettent de composer et conserver des créations textiles, des livrées de maquette, des cartes souvenirs, des hommages et les gestes du refuge. Les créations peuvent être exportées ; les textiles validés peuvent être appliqués au personnage. La maquette du Garage ne se conduit pas dans le Hub.
- Le catalogue compte vingt missions locales : les dix-neuf missions de main, plus La Première Fondation, réintroduite comme relevé du terrain, tracé d’une liaison et pose d’une fondation dans le quartier du Hub. Elle ne consulte aucune ville et ne conditionne jamais la création de Ma Ville.
- Chaque mission terminée produit un aménagement dérivé de sa ligne de progression : pupitre, plantation, relais, abri, bornes, établi ou table de rencontre. Leur état survit à la normalisation et au rechargement sans nouvelle récompense ou copie de progression. Le répertoire et les dialogues exposent les conséquences effectivement présentes.
- Les preuves définitives de secrets sont reconnues même si la mission est commencée après leur découverte. La première étape du secret audio inversé ne termine plus l’objectif avant les trois autres étapes.
- Le budget mobile choisit les PNJ après le filtrage de leurs horaires, en donnant la priorité à l’objectif actif puis aux donneurs de missions actives. Le Conducteur reste nocturne. Les horaires évoluent au changement d’heure, de journée et de météo ; les missions actives et les entretiens occupent leur lieu. Les PNJ conservent leur pays et leur Gardien canonique dans les conversations.
- Les transports enregistrent leur trajet à l’arrivée. Un départ annulé ne compte pas comme une mission accomplie. Leur durée tient compte de la distance ; train, bateau et cabine possèdent une représentation pendant le trajet. Les changements de mission ou de secret préservent la position et l’orientation dans le même lieu.
- L’évolution déjà présente dans main demeure pilotée par les huit héritages restaurés : esplanades, densité, passerelles, jalons du Cercle Brisé et retour des Gardiens. Kaïs reste le Porteur du Lien.

## Persistance et autorité

Les services restent dans `hub.services` de la sauvegarde Monde et dans son journal d’actions existant. `hubService` et `hubTextileWear` passent par le même moteur partagé que les missions ; ils ne produisent aucun XP, monnaie ou droit Premium. La Fondation suit les récompenses habituelles des missions mineures, avec réclamation unique.

L’authentification, la vérification de session, les origines, les séquences et l’engagement avec révision du serveur sont inchangés. Le test de replay exécute le véritable gestionnaire HTTP avec des réponses de base simulées : un même journal n’ajoute pas de seconde création, hommage ou récompense, et une nouvelle tentative de réclamation déjà payée est rejetée.

Ce replay ne constitue pas une preuve de service Supabase en ligne. Le serveur valide les commandes et leurs règles ; il ne dispose pas d’une attestation serveur de toutes les positions et de tous les gestes physiques du joueur.

## Vérifications et limites

La suite ciblée couvre le cycle France/Céliane/Justice, les huit héritages, les états Hub, la reprise de preuves, la Fondation locale, les créations, les dialogues, le budget mobile et le replay HTTP. Le test France isole la progression avec une victoire légale simulée : il ne certifie pas l’équilibrage complet du combat.

Les aménagements sont des volumes générés avec les géométries et matériaux réutilisés de la scène. Le jeu complet des vingt conséquences reste sous 250 maillages supplémentaires, sans lumières ni animations supplémentaires ; cela n’est pas une mesure des performances sur téléphone. Leur direction artistique demeure à améliorer.

Les trajectoires de transport utilisent encore les segments entre arrêts. La géométrie complète des voies navigables, les collisions des navires et l’embarquement animé demandent une réalisation dédiée. Les actions guidées de sauvetage, plongée et réparation n’équivalent pas à des simulations spécialisées complètes.

Les fournisseurs IA externes, les véhicules personnels à conduire, les classements de villes et les extensions annoncées comme non ouvertes restent indisponibles. Une carte Unreal cuisinée, un exécutable livré et des résultats de performance sur iOS/Android/PC réels restent nécessaires avant toute affirmation Gold Master.
