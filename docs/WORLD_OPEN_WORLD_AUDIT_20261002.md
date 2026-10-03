# Monde du 3B — audit du monde jouable et objectif d’aventure

Date : 2 octobre 2026. Périmètre : dépôt existant, sans certification AAA.

## Ce qui existe réellement

La production issue de la PR #395 ouvre le Nexus Web/Three.js. Les huit portes physiques changent la région de jeu ; elles ne constituent pas un streaming continu de huit continents. Le moteur `engine.js` exécute déjà les huit chapitres définis dans `chapters.js` : aide à un habitant, trois pouvoirs, énigme distincte, trois souvenirs, reconstruction, épreuve de valeur, combat du Gardien, inauguration et retour au Nexus. La finale exige huit pays restaurés et huit sceaux. Un pacte est une rencontre jouable à trois gestes, pas une récompense automatique.

La source du canon reste `src/world/story-canon.js`. Kaïs est Porteur du Lien, jamais neuvième Gardien. Le Cercle relie les huit héritages sans les confondre. L’Oubli résulte de la rupture de la transmission ; aucun peuple ne le représente. Le catalogue `country-campaigns.js` décrit des intentions narratives et ne remplace pas les chapitres exécutables ni le reducer autoritaire.

## Changement de cette passe

`adventure-objective.js` projette la sauvegarde existante en un objectif unique pour le HUD et le journal. Chaque destination désigne un véritable identifiant d’interaction : porte de pays, habitant/monument, souvenir, épreuve de valeur, Gardien, porte du Nexus, Cercle final ou refuge. Le journal explique le but de Kaïs et distingue souvenirs retrouvés, lieux reconstruits, sceau acquis et retour du Gardien. Un sceau seul ne déclare pas un pays restauré ; le simple catalogue de huit pays ne déclare pas huit campagnes terminées.

Ce module est une lecture pure. Il ne modifie aucune sauvegarde, ne donne aucune récompense et ne valide ni achats ni entitlements. La progression conserve les règles du moteur et de la sauvegarde serveur existants. Il n’ajoute pas de nouveau personnage ou de nouvelle vérité au lore.

## Nouvelle phase : Tournoi des Liens solo

La passe suivante ajoute dans la région France l’interaction réelle `france:tournament`, le **Tournoi des Liens**. Cette activité locale facultative met en scène trois duels d’entraînement : bloquer une attaque, éviter deux attaques, puis réussir un pouvoir pendant une ouverture. Les dégâts seuls ne suffisent pas ; les gestes sont validés par le combat en temps réel. Le nom désigne une activité d’entraînement, sans ajouter de Gardien ni de Fragment au canon.

Les tests du moteur couvrent les trois manches jouées, la récompense unique de 180 XP monde et 45 éclats, la reprise après rechargement, la défaite, l’abandon et les tentatives de commandes falsifiées. Le tournoi ne donne ni sceau, ni compagnon, ni monnaie du compte, ni classement compétitif. L’objectif d’aventure suit le duel actif et son bilan en attente, puis reprend la campagne lorsque le bilan est fermé : le tournoi ne devient pas un verrou narratif obligatoire.

Le journal `AdventureOverview` et le HUD consomment maintenant cette lecture de progression. Leur présence et leurs types ont été vérifiés dans le code, puis leur parcours a reçu la recette navigateur décrite ci-dessous. Cette phase apporte un tournoi solo exécutable, pas encore la promesse complète de spectacle, public, annonceur, classement multijoueur et événements Live Ops demandée au lancement.

## Recette navigateur exécutée

Le parcours a été vérifié sous Chromium avec rendu ANGLE D3D11 : ouverture du journal, consultation du tournoi, démarrage du duel, rechargement de la partie puis retrait du combat. L’affichage responsive en paysage 844 × 390 a été contrôlé. La recette ne relève aucune erreur JavaScript de page ni aucun débordement horizontal dans ces parcours. Les boutons d’objectif reprennent une rencontre encore ouverte ; les manches du tournoi affichent leur numéro réel après une victoire.

Cette vérification porte sur le navigateur de développement et ce format d’écran. Elle ne certifie pas les performances ou la chauffe sur téléphone physique, une session longue, les huit royaumes artistiquement finis ou une publication en production de cette nouvelle passe.

## Exploration Unreal exécutée dans cette passe

Le [bilan de l’exploration native](../unreal/ThreeBWorld/Docs/NATIVE_EXPLORATION_2026-10-02.md) décrit séparément la compilation UE 5.8.2, la construction des vraies cartes Hub et France avec acteurs externes World Partition, et le test standalone Hub → France → Hub avec déplacement et interaction. Un second test de rendu D3D12 hors écran a produit deux captures 1600 × 900 inspectées.

Cette preuve dépasse la seule présence de scripts ou de contrats : une exploration native a effectivement tourné. Sa portée reste celle d’une géométrie de prototype avec silhouette primitive, sans campagne native complète, PNJ animés finaux, multijoueur final ni client signé et installé. Les portes natives ne distribuent ni XP ni Fragment et ne valident aucun Gardien.

## Écart avec la demande AAA

Le Nexus, les chapitres et les tests existants ne prouvent pas la finition AAA des personnages, de l’audio, des animations, des intérieurs ou des populations. La foule ambiante ne démontre pas une simulation complète de routines, commerces et mémoire individuelle. Le test natif décrit ci-dessus valide l’exploration et le rendu de deux cartes de prototype ; il ne transforme pas leurs volumes, matériaux et personnages en assets finaux et ne constitue pas une sortie commerciale.

La France reste la région modèle à terminer et à vérifier visuellement avant extension des sept autres royaumes. Le tournoi était absent lors de l’audit initial ; la nouvelle phase ci-dessus comble sa boucle solo de combat et de progression, sans revendiquer sa finition AAA. Créer ma Ville conserve une progression distincte ; aucun changement commercial ou paiement réel n’est effectué ici.

## Validation attendue

Les objectifs doivent évoluer après les vraies actions du moteur, cibler des interactions présentes dans la scène, conserver les progrès au chargement et ne jamais annoncer la finale avec les seuls sceaux. Les états de rencontre, pacte, défaite et post-game doivent être lisibles. La validation artistique, les performances sur appareils physiques et les tests réseau restent des vérifications séparées des tests unitaires.

## Exceptions Gold Master examinées

Les marqueurs `gold-master-allow` de `WorldPage.jsx` couvrent les contrôles HTML préexistants des écrans pause et erreur : cette passe ajoute seulement la capture de la position avant sortie, sans créer une nouvelle famille de boutons. Les nouveaux contrôles du journal, du HUD et du tournoi utilisent le composant partagé `Button`. Dans `tournament.js`, l’accent champagne `#d6b46a` du point d’interaction est conservé ; cette exception locale de couleur ne justifie ni un nouveau thème ni des couleurs arbitraires ailleurs.
