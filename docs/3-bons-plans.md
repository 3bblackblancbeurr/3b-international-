# 3 bons plans

Route publique : /#3-bons-plans. Tuile dans Services & avantages et lien du menu Essentiel. Page chargée à la demande, accessible sans Passeport.

Six catégories : immobilier, alimentation, sport, transport, loisirs, maison (dont numérique). Au maximum trois offres distinctes par catégorie. Prix, intérêt, lieu, conditions, source officielle, dernière vérification et fin annoncée affichés. Une aide est explicitement distinguée d’une annonce.

## Flux éditorial

Fichier public/data/3-bons-plans.json. Schéma version 1 ; chaque offre doit fournir id stable, category, kind (offre/aide), title, price (texte), benefit, conditions, location, source, url HTTPS, verifiedAt UTC, expiresAt UTC ou null si non précisée ; startsAt facultatif. Ne pas confondre date d’expiration annoncée et date de vérification. publishedAt décrit le fichier, sans prolonger les offres.

Le client masque une offre après 30 heures sans vérification, dès sa fin annoncée, avant son début ou si les champs essentiels sont absents. Relecture réseau toutes les cinq minutes, au retour à la page, au rétablissement réseau et sur action manuelle. Contrôle d’expiration toutes les 30 secondes. Aucune date n’est automatiquement rafraîchie, aucune promotion fictive.

L’actualisation éditoriale nécessite une recherche réelle sur sources officielles et une publication du seul JSON sur main avec contrôle du SHA. Garder une offre uniquement après nouvelle vérification. Préférer une catégorie vide à un lien générique ou une réduction non confirmée. Ne pas garantir le stock ou l’attribution d’un logement. Éviter les annonces comportant des données personnelles.

## État au 15 octobre 2026

Six fiches initiales sourcées : bienvenue Auchan, Easybreath Decathlon, Action Logement, TER illico SOLIDAIRE, gratuités Louvre et Bitwarden individuel gratuit. Les dispositifs et services permanents ne sont pas présentés comme de nouvelles promotions. Le quota de trois par catégorie est un maximum, pas une invitation à remplir avec des offres faibles.

Après échec de création d’une nouvelle tâche (15 tâches actives sur 15), la mission quotidienne a été ajoutée au suivi existant « Finalisation complète 3B », id 6aa5d584cb7081919847a066099e1703, avec confirmation de succès le 15/10/2026. Son périmètre antérieur est conservé, sa cadence reste quotidienne (créneau habituel du matin, Europe/Paris). La nouvelle mission est explicitement autorisée à publier uniquement public/data/3-bons-plans.json, puis à vérifier le contenu réellement servi. Aucune autre veille n’a été désactivée.

Interface et flux initial vérifiés en production au commit 5cfbf80f4aa55339d004f073e25cf258953facdb, avant l’enrichissement à six fiches. Build Vite réussi ; 26 tests ciblés passent après adaptation de l’ancien test de liste des routes publiques. Contrôle visuel navigateur non disponible dans cet environnement. Une première suite générale a trouvé uniquement ce test de liste obsolète (2479 tests réussis, 1 échec, 1 ignoré) ; cet échec a été corrigé et revérifié dans la suite ciblée.

## Vérifications

node --test tests/deals.test.js tests/navigation-links.test.js tests/application-menu.test.js tests/home-premium-navigation.test.js

npm run build
