# Ma Ville : vie des quartiers

Ce lot ajoute une simulation persistante à la campagne de 24 missions principales et 8 demandes facultatives. La construction reste libre. Les achats Premium ne débloquent aucun objectif obligatoire.

## Ce qui fonctionne

- La population est enregistrée en base. Une maison placée fournit 18 places ; les bâtiments rangés ne comptent plus. La ville vide n’invente aucun habitant.
- Les commerces, services publics, ateliers et lieux culturels fournissent des postes. 60 % de la population est considérée comme active ; les emplois occupés sont plafonnés par les postes réellement disponibles.
- Eau, énergie, commerce, soins, éducation, nature et culture ont des capacités et des demandes lisibles. Ces capacités viennent des catégories et métadonnées du catalogue de bâtiments placé.
- La mobilité tient compte de la proximité des axes du plan, des routes personnelles distinctes et des équipements de transport. Les capacités ne dépendent pas du Premium.
- Quatre orientations gratuites sont sauvegardées : équilibre, nature, activité et transmission. Elles apportent un bonus limité de bien-être, de croissance ou de couverture, sans créer de bâtiments.
- Huit rendez-vous successifs demandent de conserver des conditions pendant 2 à 6 cycles : accueil, promenade, marché, rentrée, ateliers, mobilité, festival et fête des huit héritages. Ils attribuent une fois des Coins au compte et de l’XP à la Ville. L’XP des événements reste acquise après rangement ou recalcul.
- La carte affiche jusqu’à 24 habitants représentatifs, 16 sur téléphone. Leurs maisons, emplois et destinations sont issus du serveur. Les trajets suivent un graphe de routes du plan. Un bâtiment rangé disparaît des destinations.
- Les glyphs architecturaux distinguent maisons, commerces, arbres, transports, équipements et monuments sans modifier les empreintes ou les collisions. Le cadrage initial montre les constructions existantes.

## Horloge et reprise

Un cycle dure 30 secondes, d’après l’horloge PostgreSQL. L’API avance la simulation pendant la lecture ou une action ; un bouton ne permet pas d’inventer du temps. La reprise récupère au maximum 12 cycles et conserve les 12 derniers relevés. Il n’y a pas de perte causée par une absence. Ranger des logements réduit immédiatement les places et la population correspondante.

Les conditions des rendez-vous sont vérifiées aux cycles de simulation et au moment de la récompense. Une condition manquante pendant un cycle remet sa préparation à zéro. La reprise utilise la configuration de ville enregistrée au moment de la lecture ; elle ne reconstitue pas un historique physique minute par minute.

## Autorité et sécurité

Migration : `20260930233000_city3b_living_runtime.sql`.

RPC accessibles au service uniquement : `nexus_city_life_snapshot`, `nexus_city_life_action` et `nexus_city_plan_roads`. Le client ne peut envoyer ni population, ni temps écoulé, ni accomplissement, ni montants. L’API dérive le propriétaire depuis le Bearer validé et vérifie la session d’appareil. Les tables privées ont une lecture limitée à leur propriétaire et aucune écriture client.

Les récompenses partagent le verrou de compte avec la campagne, puis verrouillent la ville. Le portefeuille et le profil sont verrouillés avant le contrôle du Passeport actif. La progression d’un événement et le registre économique rendent le rejeu idempotent. Les routes sont désormais mises à jour sous le verrou de ville, sans remplacer un ancien JSON qui pourrait effacer une progression concurrente.

Appliquer la migration avant de publier le nouvel endpoint City. Si la simulation est indisponible, la carte ne fabrique pas de statistiques ; les constructions et la campagne restent consultables. Le nouvel enregistrement routier nécessite cette migration.

## Mobile et animations

Pas de boucle JavaScript de rendu par image. Les trajets utilisent SVG avec un budget borné. `prefers-reduced-motion`, le réglage interne `html[data-motion="reduced"]`, l’onglet masqué et la sortie du viewport retirent les animations de trajet. Les chiffres restent accessibles avec le mouvement désactivé. Une actualisation légère de la vie a lieu toutes les 15 secondes lorsque la ville est ouverte et visible.

## Validation et limites

Les tests PGlite exécutent les migrations City réelles et isolent seulement l’adaptateur de portefeuille commun. Ils vérifient census, horloge, reprise bornée, bâtiments rangés, services, emplois, politique persistante, propriétaire, suspension, rollback et rejeu. Un parcours complet finance la campagne depuis le départ et accomplit les huit rendez-vous avec leurs conditions réelles. Les tests de l’endpoint vérifient session révoquée, entrée falsifiée et limite de requête ; les tests de trajet vérifient destinations, budget et absence de personnages fantômes.

Le harness `work/visual-city` est un aperçu local séparé, marqué TEST LOCAL, construit avec une fixture SQL. Il n’appartient pas à l’application et n’utilise aucun compte réel.

Ce système est une simulation de quartier par capacités et cycles. Il ne propose pas de salaires, d’impôts, de véhicules conduits, de simulation physique du trafic, d’habitant individuel stocké comme dossier ou de festival multijoueur en direct. Les personnages visibles représentent la population ; les déplacements illustrent leur activité du cycle. Aucun résultat de production ni performance sur appareil réel n’est attesté par les tests locaux.
