# 3 bons plans

Route publique : /#3-bons-plans. Tuile dans Services & avantages et lien du menu Essentiel. Page chargée à la demande, accessible sans Passeport.

Six catégories : immobilier, alimentation, sport, transport, loisirs, maison (dont numérique). Au maximum trois offres distinctes par catégorie. Prix, intérêt, lieu, conditions, source officielle, dernière vérification et fin annoncée affichés. Une aide est explicitement distinguée d’une annonce.

## Flux éditorial

Fichier public/data/3-bons-plans.json. Schéma version 1 ; chaque offre doit fournir id stable, category, kind (offre/aide), title, price (texte), benefit, conditions, location, source, url HTTPS, verifiedAt UTC, expiresAt UTC ou null si non précisée ; startsAt facultatif. Ne pas confondre date d’expiration annoncée et date de vérification. publishedAt décrit le fichier, sans prolonger les offres.

Le client masque une offre après 30 heures sans vérification, dès sa fin annoncée, avant son début ou si les champs essentiels sont absents. Relecture réseau toutes les cinq minutes, au retour à la page, au rétablissement réseau et sur action manuelle. Contrôle d’expiration toutes les 30 secondes. Aucune date n’est automatiquement rafraîchie, aucune promotion fictive.

L’actualisation éditoriale nécessite une recherche réelle sur sources officielles et une publication du seul JSON sur main avec contrôle du SHA. Garder une offre uniquement après nouvelle vérification. Préférer une catégorie vide à un lien générique ou une réduction non confirmée. Ne pas garantir le stock ou l’attribution d’un logement. Éviter les annonces comportant des données personnelles.

## État au 15 octobre 2026

Trois fiches initiales sourcées : code de bienvenue Auchan, Easybreath Decathlon et accès au logement abordable Action Logement (dispositif, pas annonce). Les autres catégories restent vides.

La création de l’automatisation quotidienne a échoué : too_many_active_automations, 15 tâches actives sur 15. Aucune veille existante n’a été modifiée. Il faut que le propriétaire choisisse une tâche à remplacer ou libère un emplacement ; ne pas présenter l’actualisation comme activée avant confirmation de l’outil.

## Vérifications

node --test tests/deals.test.js tests/navigation-links.test.js tests/application-menu.test.js tests/home-premium-navigation.test.js

npm run build
