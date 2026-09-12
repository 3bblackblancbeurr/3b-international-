# Origins : intégration des cinématiques et publication

La présentation de la PR 42 est adaptée au nouvel éditeur Origins. Après enregistrement réussi, sept plans présentent le personnage réel, son équipement et les valeurs de combat de son arme. Durée : 32 secondes. Passer, pause et lecture manuelle sont disponibles. Le menu permet de revoir la présentation. L'ancien éditeur conserve également la présentation adaptée à ses règles.

Le directeur du monde gère une file bornée et les scènes d'entrée dans un pays, d'épreuve, de restauration, de combat, de victoire et de repli. Les premières visites sont sauvegardées. Le combat et le délai des pouvoirs de compagnon n'avancent pas pendant les scènes. Les récompenses restent attribuées par les règles du jeu, jamais par la lecture d'une scène.

Le menu du monde donne accès directement à l'arène existante. Ses cadrages mettent en valeur le vainqueur réel et conservent une vue neutre pour une égalité. Les cinématiques n'ajoutent pas de délai local aux matchs en ligne.

## Bâtiments et arsenal inclus

La livraison inclut les améliorations locales précédentes : seize armes, quatre paliers d'évolution, trois compagnons loups et leurs soutiens, commandes de combat, intérieurs de services, quartiers régionaux et reprise des huit monuments. La Tour Eiffel détaillée comporte 66 204 triangles. Les quartiers régionaux utilisent désormais les GLB détaillés en qualité élevée et les GLB allégés en qualité mobile ; auparavant seuls les modèles allégés étaient chargés.

## Limites réelles

- Les scènes utilisent les personnages et animations existants. L'attaque de présentation est une animation ; il ne s'agit pas d'un tutoriel de combat interactif avec cible et calcul de dégâts.
- La défense présentée est la protection réelle de l'arme et l'esquive existante. Aucun système de parade avec détachement/rappel des ciseaux n'est annoncé comme terminé.
- Les sept régions hors France disposent de la boucle régionale de restauration et de combats, pas de sept campagnes narratives aussi développées que la France.
- L'arène conserve son protocole existant. Aucune nouvelle entrée synchronisée entre deux appareils n'est ajoutée. La coopération du monde ouvert n'est pas réalisée.
- Les monuments sont des interprétations compactes. Sculptures patrimoniales détaillées, intérieurs complets, voix et animations originales restent à produire.
- La vérification navigateur mobile ne remplace pas un contrôle sur Samsung physique.

Les scripts `verify-cinematics-integrated.mjs`, `verify-arena-release.mjs` et `verify-regional-combat.mjs` vérifient les parcours locaux. Le résultat réel de publication et ses identifiants sont rapportés séparément après déploiement.
