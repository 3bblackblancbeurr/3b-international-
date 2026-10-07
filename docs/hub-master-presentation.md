# Présentation du Hub

Les identifiants enregistrés des missions, habitants, événements et lieux restent inchangés. Le module de présentation fournit leurs libellés français dans le journal, les objectifs, les conversations et l’atlas.

Le journal affiche les montants réels de `hubMissionReward`, puis distingue les missions en cours, les récompenses à récupérer, les nouvelles histoires et les prérequis. Une histoire suivante devient disponible après récupération de la récompense précédente.

Choisir une destination dans l’atlas place un repère. « Localiser mon repère » déplace seulement la vue de la carte. Le guidage se lance depuis le monde, et l’embarquement depuis la station. Les distances de la liste sont mesurées à vol d’oiseau ; les tracés représentent les chemins réellement calculés.

Les anciennes recherches « Place du Sol » et « Terrasses de l’Onis » retrouvent les noms harmonisés « Place del Sol » et « Terrasses de l’Oasis ».

## Cartographic materials

Les lignes JSX de `Cartography.jsx` consacrées aux belvédères, aux étages de la Tour et au tracé de chemin conservent exactement leurs pigments et leurs géométries déjà présents. Seuls les titres accessibles, les noms et les altitudes affichées changent. Les exceptions `gold-master-allow` sur ces trois lignes documentent cette conservation ; elles n’autorisent aucune nouvelle couleur de commande, aucun nouveau rayon ni aucune nouvelle ombre.
