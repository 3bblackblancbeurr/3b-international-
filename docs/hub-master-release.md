# Hub central — version de validation

## Périmètre livré

La Cité des Huit Héritages conserve sa silhouette, son image de référence, ses huit portes et ses identifiants enregistrés. Les pays, leur histoire et leurs mécanismes restent hors de cette livraison. Les améliorations des habitants qui attendaient sur la branche précédente sont reprises : conversations attentives, distance naturelle et captures avec la caméra réelle.

Le parcours d’accueil, l’objectif, le repère, le guidage et son annulation deviennent explicites. L’aide accompagne déplacement, carte et interaction, reste rejouable et se conserve après rechargement. Les menus d’actions fonctionnent au clavier et au tactile. Le journal traduit les conditions et affiche les récompenses réellement attribuées. Les noms et les recherches de l’atlas sont harmonisés, avec distances et altitudes lisibles.

Les réglages regroupent reprise, accès aux services, sauvegarde, confort, graphismes, audio et commandes. Le remappage refuse les conflits de touches ; AZERTY, QWERTY et réinitialisation sont disponibles. Le compagnon de l’application est facultatif dans le monde. Les notifications de découverte disparaissent et distinguent les XP du compte de ceux du monde.

## Sauvegarde et logique

Le journal conserve ses actions jusqu’à un reçu serveur valide. Une réponse HTTP réussie et incomplète ne suffit pas. Les états affichés distinguent copie invitée, synchronisation confirmée, actions en attente, réseau, connexion et stockage local. Une synchronisation déjà engagée est réutilisée. Le retour du réseau déclenche une nouvelle tentative.

Une ouverture de compte sans copie locale et sans réponse serveur est arrêtée avant toute nouvelle progression. Un dialogue de reprise garde le focus ; les commandes du jeu restent bloquées. Une restauration invitée vérifie l’écriture locale avant d’adopter les données. Les récompenses de missions sont récupérables chez le donneur et ne sont attribuées qu’une fois.

## Décor et rendu

Les 96 pavillons reçoivent volets, seuils, gouttières, aérations, adresses et lanternes de nuit. Le mortier est filtré dans les coordonnées locales des façades. La déformation du feuillage correspond aussi à ses ombres. Les oiseaux restent groupés, réduits en qualité fluide et absents la nuit ou pendant les intempéries fortes.

Treize stations de repos comportent bancs, plantations, poubelles et plaques. Une spécification commune aligne maillage, collisions, siège, accès et atlas. Leur implantation respecte les chemins, portes et toutes les étapes futures des missions. Le mobilier utilise cinq groupes de matériaux, plus l’atlas de plaques ; les petits détails disparaissent à distance. Les ressources appartiennent au cycle de destruction existant.

Les véhicules partagent le même modèle entre service et monde : coque, ponts et équipement de la navette ; vitrage et ouvrants du train ; vitrage, châssis et assises des cabines. Les détails sont regroupés par matériau. Les enveloppes, roues, câbles et mouvements restent ceux des transports existants.

La plateforme reste sous le plafond existant de 260 maillages statiques. Les modes fluide, adaptatif et détaillé gardent leurs budgets. Les anciennes ombres PCFSoft dépréciées sont remplacées par PCF dans le monde et ses aperçus partagés.

## Vérification reproductible

`npm run verify` exécute les tests et compile la livraison. `npm run test:gold-master`, `npm run brand:verify` et `GOLD_MASTER_BASE=origin/main npm run gold-master:guard` vérifient la charte et les assets protégés.

`scripts/verify-hub-master-browser.mjs` monte la vraie WorldPage avec ses contextes privés de test : hub, guidage et arrêt, réglages, conflit de touches, atlas et journal, reprise et récupération réseau. Aucun compte réel n’est contacté. Le service simulé valide réellement les commandes avec le moteur ; il ne remplace pas un essai de synchronisation sur plusieurs appareils.

Les scripts de rendu et de services contrôlent WebGL, jour/nuit, navigation, habitants, interactions, ascenseur, six services, favoris, rechargement et libération des ressources. Le workflow du hub garde les captures et rapports comme artefacts.

## Limites de qualification

Les contrôles locaux du navigateur utilisent Chromium/SwiftShader ; ils vérifient le fonctionnement et les shaders, sans mesurer le GPU d’un téléphone réel. Le style reste celui de la cité architecturale existante. Cette livraison n’est pas une certification AAA ni une garantie d’absence de défaut. Les achats, comptes réels sur plusieurs appareils et appareils iOS/Android physiques demandent une recette dédiée. Aucun achat et aucune progression réelle n’ont été utilisés pour cette qualification.
