# 3B — Le Monde Invisible

Extension intégrée à l’application existante, au Passeport et à la sauvegarde du Monde 3B : route `#monde-invisible`, accessible depuis le menu et le Monde.

## Campagne des huit royaumes

Les huit aventures sont ouvertes dès le début. Chacune propose trois énigmes originales ordonnées, des indices, trois propositions facultatives pour débuter, un journal, un coffre, un fragment et un portail.

| Royaume | Ville | Gardien | Valeur |
| --- | --- | --- | --- |
| France | Thonon-les-Bains | Céliane | Justice |
| Algérie | Alger | Yliane | Loyauté |
| Maroc | Rabat | Naël | Noblesse |
| Tunisie | Tunis | Soraya | Courage |
| Espagne | Barcelone | Diego | Passion |
| Italie | Rome | Alessio | Espoir |
| Turquie | Istanbul | Émir | Foi |
| Estonie | Tallinn | Eira | Sagesse |

Les récits et repères sont des fictions originales, sans affirmation historique ni destination GPS. Les villes et les scènes s’illuminent avec les réponses ; les coffres, les fragments et les portails changent après validation. Les huit fragments ouvrent une dernière énigme personnelle : la Convergence des huit héritages.

Chaque coffre donne une seule fois 120 XP Monde et 30 éclats. La finale donne une seule fois 240 XP Monde et 60 éclats : 1 200 XP et 300 éclats gagnables au total, en plus du stock initial. Les récompenses du compte sont confirmées par la transaction serveur : 120 XP et 15 pièces pour chaque coffre, puis 240 XP et 30 pièces pour la finale, soit 1 200 XP compte et 150 pièces au total. Des limites dédiées à vie empêchent les reprises, doublons ou autres appareils de doubler ces gains. Aucune carte supplémentaire n’est créée dans la collection existante.

## Lentille Invisible, caméra et AR

Le bouton « Ouvrir l’exploration visuelle » est disponible avant les énigmes. La scène originale en 3D montre un Gardien, un fragment, un coffre, un portail et les trois traces. Glisser, pincer, recentrer, choisir une vue ou toucher un objet permet de l’inspecter. Une liste accessible permet la même inspection si WebGL manque. Inspecter ne valide pas une réponse et ne donne aucune récompense.

« Voir avec ma caméra » demande explicitement l’autorisation du navigateur et superpose les objets au flux local, sans suivi spatial. « Placer sur une surface » utilise une vraie session WebXR `immersive-ar` avec `hit-test` requis. Le joueur vise un repère de surface, puis touche pour placer l’assemblée ; « Replacer » permet un autre placement. Le navigateur doit prendre en charge WebXR et la détection de surface. Les poses proviennent des images XR réelles ; aucun lieu ou objet physique n’est reconnu. Ce n’est pas une AR géolocalisée.

Caméra et orientation sont facultatives, demandées séparément, sans micro ni enregistrement. Fermer, changer de compte ou de royaume, cacher l’application, perdre le flux caméra ou terminer la session XR arrête les capteurs et libère les ressources. Une autorisation qui arrive après annulation est aussi nettoyée. Le mode 3D sans caméra fonctionne indépendamment des permissions et capacités AR. Les animations respectent la réduction de mouvement. Les versions Android et iOS déclarent les autorisations caméra et localisation en premier plan nécessaires aux boutons explicites ; le matériel est facultatif et aucun microphone n’est demandé. Ces déclarations seront embarquées par une nouvelle compilation native, sans modifier les versions déjà installées.

Une ambiance originale synthétisée est activable explicitement, avec des accords sur les découvertes validées. Elle s’arrête en arrière-plan. La lecture facultative des réponses utilise uniquement une voix française locale du navigateur lorsqu’elle existe.

## Sauvegarde et confidentialité

Le jeu à distance permet toute l’aventure. La promenade est facultative : espace public accessible de son choix, arrêt pour lire, téléphone rangé avant de traverser, aucune entrée dans une propriété, aucun besoin d’approcher l’eau. Les cartes artistiques ne fournissent aucun itinéraire.

La progression de chaque royaume est conservée séparément. Les commandes hors ligne ciblent explicitement leur épisode ; les anciens journaux et onglets sans identifiant restent associés au Léman, y compris lorsque le même compte choisit un autre royaume ailleurs. La synchronisation suit les reçus serveur, conserve les commandes en cas de réponse incomplète et protège les actions intervenant pendant une requête. Une première connexion sans copie récupérable attend le serveur avant de permettre de jouer.

La mémoire facultative garde seulement les événements canoniques futurs consentis : au maximum 49 résumés de progression. Aucun dialogue, image ou position n’est enregistré. Retirer le consentement efface les souvenirs sans effacer l’aventure ; une révision empêche une ancienne commande hors ligne de réactiver la mémoire. Les sauvegardes de récupération sont également expurgées.

## Gardiens et missions collectives

Les huit Gardiens utilisent leur personnalité canonique, la progression de l’épisode actif et les seuls souvenirs consentis. Le dialogue est éphémère ; changer de royaume, quitter la vue ou changer de compte l’efface. Le serveur vérifie le compte, la session et le Passeport, limite les requêtes et lit la progression confirmée. Un message ne peut ni résoudre une énigme ni attribuer une récompense.

Le raccordement au fournisseur génératif est livré avec `store:false`, sans outil ni clé navigateur. La disponibilité réelle est affichée. Si l’IA est désactivée, non configurée ou indisponible, le Gardien donne une réponse narrative clairement identifiée. Les secrets ou réglages globaux du projet n’ont pas été inventés ni remplacés. Une génération active transmettrait le message et jusqu’à trois échanges au fournisseur ; ses règles de conservation s’appliquent.

La mission permanente des huit échos exige le coffre synchronisé du Léman, une contribution immuable par compte et huit affinités représentées, donc au moins huit comptes distincts. Chaque affinité révèle une lettre ; les huit contributions débloquent une finale personnelle collective. Une affinité de jeu ne certifie jamais la résidence. Seuls les totaux et la propre contribution sont affichés.

Les saisons disposent d’un calendrier PostgreSQL, de contributions et de résolutions durables par compte et événement. Une saison achevée garde sa date de première résolution, même si une contribution disparaît. Les accès, dates d’ouverture et finales sont contrôlés côté serveur ; le calendrier du navigateur ne décide pas de l’éligibilité. Les réussites collectives sont des accomplissements, sans récompense monétaire supplémentaire.

| Saison | Début UTC | Fin exclusive UTC |
| --- | --- | --- |
| La saison du Lien | 9 octobre 2026 | 1 décembre 2026 |
| La veille des liens | 1 décembre 2026 | 1 mars 2027 |
| Le retour des voix | 1 mars 2027 | 1 juin 2027 |
| La route des échos | 1 juin 2027 | 1 septembre 2027 |
| L’archive des passages | 1 septembre 2027 | 1 décembre 2027 |

## Validation et exploitation

`node scripts/verify-world.mjs` exécute tous les tests du dépôt puis la construction de production. Les tests PostgreSQL PGlite exécutent les migrations réelles : plafonds de récompenses, transactions, sessions, calendrier SQL, contributions, finales, reprises et interdiction d’accès client direct. Les contrôleurs caméra/XR sont testés avec des sessions et poses simulées, notamment les permissions tardives et les interruptions.

`node scripts/verify-invisible-browser.mjs` exécute les 24 énigmes et la finale avec de vrais clics à 1 440 × 900 et 390 × 844. Il couvre l’inspection avant toute énigme, les erreurs, la caméra acceptée/refusée, l’arrêt en arrière-plan, l’effacement de mémoire, la coopération, une saison, le dialogue de repli, le rechargement et l’absence de débordement. Les services et huit comptes sont synthétiques ; la caméra acceptée est un MediaStream généré par canvas. Aucun joueur réel, capteur personnel ou appel IA payant n’est utilisé.

Pour vérifier les bundles publiés, définir `INVISIBLE_TEST_URL`. `PLAYWRIGHT_MODULE` peut pointer vers un Playwright installé hors dépôt, et `INVISIBLE_TEST_OUT` vers un dossier de résultats. La CI réalise aussi le parcours. Un placement WebXR physique doit encore être vérifié sur un téléphone compatible : les simulations ne certifient pas la précision d’un appareil réel.

`prepare-world-engine.mjs` et `prepare-invisible-guardian.mjs` emballent les sources canoniques pour Supabase. Le candidat historique Gold Master reste inchangé. Les migrations appliquées sont suivies par SHA-256. Les seules exceptions visuelles documentées concernent les balises natives `video` recevant un MediaStream local via `srcObject` ; les contrôles utilisent le design system.

Voir [le contrat des Gardiens, du Cercle et des saisons](./INVISIBLE-GUARDIAN-SERVICES.md).
