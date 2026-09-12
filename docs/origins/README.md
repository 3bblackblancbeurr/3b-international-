# 3B ORIGINS — Le Cercle Brisé

Branche : `codex/3b-origins-justice`. Première partie web : Sanctuaire du Cercle et quartier France, complétée par sept régions. La publication a été demandée explicitement par le propriétaire le 12 septembre 2026, après correction des défauts de l'audit. Voir [la reprise régionale](../WORLD_REWORK_2026-09-12.md) pour le périmètre et les limites actuels.

## Jouer

`npm ci`, puis `npm run dev -- --host 127.0.0.1` et ouvrir `/#monde-3b`. Pour tester la compilation : `npm run build`, puis `npm run preview -- --host 127.0.0.1`.

L’entrée existante du Monde 3B ouvre Origins. Pause → Version précédente permet de retrouver l’ancienne aventure, avec ses anciennes sauvegardes. Le changement d’entrée tient à un import dans `src/App.jsx` ; boutique, fidélité, autres jeux et backend restent séparés.

Commandes : ZQSD/WASD ou flèches, Maj pour courir, glisser pour orienter la caméra, clic au sol pour marcher. E interaction, F loup, V Vision de Mémoire, J attaque rapide, K puissante, Espace esquive, R Cercle, C recentrage. Carte et journal proposent aussi de rejoindre un lieu en marchant par les passages praticables. Sur écran tactile : déplacement à gauche, caméra à droite et actions séparées. Les réglages restent accessibles en pause.

## Parcours construit

1. Éveiller le Cercle et traverser la porte France.
2. Écouter l’habitante, laisser le loup retrouver la trace près de la fontaine, puis la lire avec la Vision de Mémoire.
3. Rencontrer le Gardien de Justice. Confier le sceau gauche au loup et activer le plateau droit : les Archives s’ouvrent.
4. Révéler et lire les deux témoignages dans les Archives, puis combattre la manifestation de l’Oubli.
5. Recueillir le fragment de Justice : disparition de la corruption, plantes restaurées et dialogues modifiés. Revenir au Cercle pour replacer le fragment.

Deux rencontres secondaires : les graines du jardin pour renforcer la tenue, et le souvenir du passage haut pour la Maison des souvenirs. Un secret sous le tilleul renforce le lien avec le loup. Après la Justice, le quartier reste explorable.

Les trois quêtes principales attribuent 40, 60 et 120 XP une seule fois. Les rencontres secondaires attribuent 30 et 35 XP ; le secret, 15 XP. Ces XP appartiennent uniquement à l’aventure. Aucun avantage commercial, monnaie réelle ou jeton blockchain n’est attribué par cette sauvegarde locale.

## Architecture et décisions

- Three.js dans le navigateur ; aucune IA nécessaire pendant une partie. Pas de migration Unreal ni de rendu natif annoncé pour cet aperçu.
- `data.js` : huit pays, échelle en mètres, lieux, valeurs et quêtes. France–Justice est validé par le brief. Les sept autres associations sont explicitement des propositions modifiables.
- `space.js` : collisions, déplacements par petits pas, navigation A*, sol et rampes. Les portes et l’ameublement des Archives participent aux collisions.
- `companion.js` : suivi, recherche, attente sur un sceau, récupération d’un compagnon bloqué à une place contrôlée près du joueur.
- `combat.js` : simulation temporelle, coûts, portée, visibilité, esquive, attaques annoncées, récupération et deuxième phase de l’adversaire.
- `state.js` : progression, conditions, récompenses uniques et sauvegarde versionnée. Clé `3b-origins-v1:<compte ou guest>` ; stockage sur cet appareil, sans synchronisation Internet. Une position invalide revient à un point sûr. Les anciennes clés sont préservées.
- `environment.js`, `actors.js`, `scene.js`, `audio.js` : décor, modèles animés, caméra/entrées/boucle et synthèse sonore séparés. Les géométries statiques sont regroupées par matériau ; les façades répétées sont instanciées. Une seule zone est chargée à la fois.
- Caméra perspective à 52°, distance choisie 6 à 12 m, conservée entre les zones. Seul un obstacle réduit temporairement la distance, avec retour progressif. Sensibilité, suivi et secousses réglables.
- Profils : plafond de densité de pixels 1,8 / 1,2 et ombres 2048 / 1024. L’automatique détecte le pointeur tactile ; ce n’est pas une estimation universelle de la puissance GPU.

## Direction artistique et état réel

Pierre claire, bronze champagne, vêtement noir, lumière accueillante ; bleu réservé aux traces et au Cercle. Les concepts générés sont des références de production, pas des captures du jeu. Le manifeste décrit les ressources réellement intégrées.

Le rendu reste stylisé et certains éléments sont encore des modèles de travail : statues, identité du gardien, vêtements et diversité des habitants. Le nom officiel et l’apparence du gardien n’ont pas pu être vérifiés dans une conversation contenant les images. « Gardien de Justice » est une désignation fonctionnelle provisoire. Aucun rôle n’est attribué à Céliane.

Les sept autres portes indiquent des zones **à développer**. Cette livraison ne réalise ni huit villes complètes, ni multijoueur Internet, ni photoréalisme, ni version Android native. Le quartier possède trois intérieurs utilisables ; les autres façades ne promettent pas d’intérieur. Les habitants ont des déplacements et interactions simples, pas une simulation sociale complète. Le loup dispose d’animations originales articulées, encore perfectibles artistiquement.

Voir [les vérifications](verification.md) et [le manifeste](assets.json). Prochaine étape artistique : faire valider les silhouettes de Kaïs, du loup et du gardien sur des captures de cette scène, puis remplacer les éléments provisoires avant d’étendre aux autres pays.
