# 3B International — Carte du Monde Vivante V4 / Concept 13

## Ce qui a réellement été modifié
- L'accueil n'est plus un globe solitaire géant, ni une affiche collée. Il devient une interface React mobile d'un seul écran : Terre nocturne issue de photos NASA, connexions **illustratives**, 4 onglets Monde / Hubs 3B / Communauté / Opportunités, huit royaumes narratifs illustrés, recherche par pays et rubrique, 22 vrais univers, dock 3B or et menu complet « Voir tout ».
- Les 22 icônes visibles forment un rail discret pour limiter les cadres superflus. Les 22 liens s'ouvrent aussi dans un dialogue natif accessible au clavier ; les rubriques du menu 3B original restent intactes.
- Chaque onglet ouvre des destinations réelles de l'application, sans prétendre fournir des statistiques de membres, des bureaux ou hubs opérationnels ni des offres commerciales inexistantes.
- Les huit royaumes sont les pays / valeurs / gardiens du canon 3B, **pas des agences internationales**. La recherche ne dépend d'aucun serveur ni de données de membres.
- Performance : 2 tailles d'image NASA localisées (mobile ~41 KB, grand écran ~99 KB), huit portraits locaux très légers, photos chargées de manière différée dans le rail, animation CSS activée seulement sans préférence de mouvement réduit, aucun nouveau WebGL ni requête de géolocalisation. Repères de la carte alignés au planisphère par ResizeObserver.
- Albert Prestige V3, Santé, Passeport, association, crypto, Stripe, Supabase et Monde du 3B existants ne sont pas modifiés.

## Sources visuelles et intégrité des données
- Référence maîtresse : affiche Concept 13 fournie par le propriétaire, plus ses HTML décrivant Monde / Hubs / Communauté / Opportunités, pays en avant et 22 modules.
- Carte : NASA Earth Observatory, Night Lights 2012, https://earthobservatory.nasa.gov/images/79765/night-lights-2012. Source locale optimisée (détails dans public/art/atlas-v4/SOURCE.md).
- Les portraits des royaumes sont des extraits de ressources 3B existantes, pas de photos de membres.
- Les exemples « 1,2 M membres », « 850 K membres », « hubs ouverts » présents dans les maquettes de référence sont des valeurs illustratives non vérifiées et ne sont ni affichés ni enregistrés par l'application.
- Design : noir profond, champagne or, lumière cyan, pictogrammes clairs, navigation non encombrante. Ambition de plus grande fidélité visuelle, sans certification AAA ou véritable infrastructure de hubs mondiaux.

## Validation avant publication
- Test de navigation Playwright Edge : 320 × 568, 360 × 740, 390 × 844, 768 × 1024, 1440 × 900. Affichage sans dépassement horizontal/vertical, 4 onglets, huit royaumes, 22 modules, navigation réelle et recherche Maroc.
- Suite browser étendue scripts/verify-world-living-ui.mjs pour 7 formats et Albert V3.
- Parcours clavier / menu / scanner scripts/verify-app-experience.mjs et scripts/verify-application-ui.mjs.
- Axe : 0 violations automatiques WCAG 2.0/2.1 A/AA sur accueil et menu à 390 / 1440 px (pas une certification).
- Construction Vite et garde visuel Gold Master.
- Tests manuels Samsung S21 et Xiaomi à faire : cache PWA, fluidité réelle, gestes tactiles, éventuel gel et flou.

Aucun nouveau paiement, abonnement Claude, authentification d'un autre appareil, serveur Albert public, ni migration de données.