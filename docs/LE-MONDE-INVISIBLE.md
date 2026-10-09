# 3B — Le Monde Invisible

Première livraison du 9 octobre 2026 : extension de l’application 3B existante, accessible à `#monde-invisible`, avec le Passeport et la sauvegarde du Monde 3B. Le menu principal et le panneau du Monde donnent accès à l’aventure.

## Épisode 001 — Le Fragment englouti

Fiction originale située à Thonon-les-Bains, inspirée du Léman. Céliane accompagne le joueur dans trois énigmes ordonnées. Les réponses débloquent un coffre, le fragment de la Justice dans le carnet et un portail vers le Monde 3B.

Le coffre accorde une seule fois 120 XP du Monde et 30 éclats. La synchronisation transactionnelle accorde au compte 120 XP et 15 pièces, avec une limite dédiée d’une récompense à vie. Les reprises hors ligne et les répétitions de commandes ne doublent pas ces gains. Le fragment reste dans le carnet de cette aventure ; aucune carte supplémentaire n’est créée dans la collection existante.

Le portail possède une scène 3D et une solution de repli si WebGL est indisponible. Son activation reste narrative ; entrer dans le Monde conserve la région actuelle et ne valide pas ses sceaux.

## Exploration et confidentialité

Le mode sans déplacement est proposé par défaut et permet toute l’aventure. La carte est schématique : ses repères ne sont pas un itinéraire ni des coordonnées réelles. Le mode balade rappelle de rester dans les espaces publics et d’arrêter de marcher pour utiliser le téléphone.

La localisation et la caméra nécessitent chacune un clic explicite. Une vérification de localisation utilise temporairement le navigateur, sans conserver ni transmettre les coordonnées ; elle ne conditionne aucune récompense. L’aperçu caméra reste local, sans audio ni enregistrement. La caméra et la localisation s’arrêtent à la fermeture ou lorsque la page devient invisible. La superposition visuelle ne réalise pas de suivi spatial.

La mémoire facultative ne conserve que les événements canoniques survenus après son activation. Aucun dialogue ni position n’est enregistré. Retirer le consentement ou oublier les rencontres efface cette mémoire sans effacer la progression ; une révision de consentement empêche une ancienne commande hors ligne de la réactiver. Les sauvegardes de récupération sont également expurgées.

## Gardienne et coopération

Le dialogue est éphémère. Le service serveur vérifie le compte, la session et le Passeport, limite les requêtes et obtient le contexte confirmé depuis la sauvegarde. Les messages ne valident jamais une énigme et ne distribuent pas de récompense.

Le raccordement au fournisseur IA est livré, avec `store: false`, un contexte borné et aucune clé côté navigateur. Le 9 octobre, les capacités publiques du projet indiquaient que les services IA étaient désactivés : Céliane fonctionne donc actuellement avec le récit narratif. Une activation future transmettrait le message courant et jusqu’à trois échanges au fournisseur ; ses règles de conservation s’appliquent. Aucun réglage global d’IA n’a été changé pour cette livraison.

Le Cercle des huit échos utilise de vraies contributions serveur. Chaque compte avec Passeport actif peut choisir un royaume d’affinité après avoir synchronisé son coffre. Ce choix reste unique pour cette mission. Les huit affinités exigent au moins huit comptes ; elles ne certifient pas un lieu de résidence. Seuls des totaux agrégés et la propre contribution du joueur sont affichés, sans position ni nom public.

## Périmètre livré

| Fonction | État |
| --- | --- |
| Première aventure, trois énigmes, coffre, fragment, sauvegarde | Livrés |
| Intégration au Passeport, récompenses et Monde 3B | Livrée |
| Portail 3D, mode sans déplacement, aperçu caméra local | Livrés |
| Gardienne narrative et mémoire facultative | Livrées |
| Raccordement au dialogue génératif | Livré, fournisseur actuellement désactivé |
| Première mission collective des huit royaumes | Livrée |
| Autres épisodes locaux, réalité augmentée spatiale, saisons et villes évolutives | À développer |

Les huit royaumes respectent les valeurs existantes du 3B : France/Justice, Algérie/Loyauté, Maroc/Noblesse, Tunisie/Courage, Espagne/Passion, Italie/Espoir, Turquie/Foi et Estonie/Sagesse.

## Validation et exploitation

`node scripts/verify-world.mjs` a terminé avec 2 227 tests réussis, aucun échec, un test ignoré et une construction de production réussie. Les tests PostgreSQL vérifient notamment la récompense transactionnelle, sa reprise et la coopération avec les droits SQL effectifs. Des tests de mémoire couvrent le retrait concurrent du consentement.

`node scripts/verify-invisible-browser.mjs` vérifie le parcours complet à 1 440 × 900 et 390 × 844 : clics réels, énigmes, erreurs, coffre, portail, refus de capteurs, effacement de mémoire, synchronisation, contribution, dialogue de repli et rechargement. Ces scénarios interceptent les services et utilisent un compte synthétique : aucune donnée de joueur réel n’est modifiée. La CI exécute également ce parcours.

Pour vérifier les bundles publiés avec les mêmes fixtures, définir `INVISIBLE_TEST_URL` avec l’URL de l’application. `PLAYWRIGHT_MODULE` peut désigner un module Playwright installé hors du dépôt et `INVISIBLE_TEST_OUT` un dossier de résultats.

Le moteur déployé est préparé par `scripts/prepare-world-engine.mjs` depuis les sources canoniques. Le Gardien est préparé par `scripts/prepare-invisible-guardian.mjs`. Le candidat historique Gold Master reste inchangé. Les migrations SQL appliquées sont enregistrées dans `APPLIED_MIGRATIONS_SHA256.json`.

L’unique exception `gold-master-allow` de cette interface concerne la balise native `<video>` de l’aperçu caméra : elle reçoit un `MediaStream` via `srcObject`, sans URL de média ni source distante. Les commandes utilisent les composants du design system ; les couleurs, rayons et ombres proviennent des tokens.

Voir aussi [les services du Gardien et du Cercle](./INVISIBLE-GUARDIAN-SERVICES.md).
