# Accueil et navigation 3B — 30 septembre 2026

L’accueil présente trois parcours distincts : **Passeport**, **Créer ma Ville** et **Monde du 3B**. Le Passeport conserve sa carte unique et ne contient aucun accès vers les jeux. La ville personnelle possède sa case dans l’accueil et le menu principal ; la Cité des Huit Héritages reste le centre de l’aventure.

## Présentation livrée

- Accueil noir, or et bleu, photographie du hall déjà validée, cadre architectural, titre et actions adaptés au téléphone.
- Trois illustrations propres aux parcours : identité, construction et Cercle Brisé. Elles sont décoratives et ne représentent pas des données de compte.
- Menu et navigation avec repères Identité, Création et Aventure, liens réels et comportement clavier conservé.
- Présentation du Passeport dans un écrin distinct, sans modifier le visuel choisi de la carte.
- Carte des huit portes et accès aux autres espaces conservés.

`useSceneMotion` arrête les animations décoratives lorsque l’accueil sort de l’écran ou que l’onglet devient invisible. Le bouton de pause, les réglages du compte et la préférence système de réduction des mouvements sont respectés. Les styles de finition sont regroupés dans `src/styles/experience-premium.css` et chargés après les styles existants.

## Vérification et limites

Le navigateur a servi à vérifier les liens, le menu, la pause, la lisibilité et l’absence de défilement horizontal à 320, 390 et 768 pixels. Les captures utilisateur se trouvent dans le dossier outputs du chat. Ce contrôle d’interface ne prouve pas l’autonomie, la chauffe ou les performances sur un téléphone physique.

La refonte de cette passe couvre l’accueil, la navigation et la présentation des trois parcours. Les autres écrans spécialisés conservent leur fonctionnement ; la direction artistique complète des royaumes, les personnages manga et les médias définitifs restent des travaux de production distincts.
