# Combat — commandes et lisibilité

Cette passe améliore le jeu existant ; elle ne remplace pas les personnages et les villes par les modèles détaillés des images de référence.

- Les boutons d’attaque et d’esquive réagissent au contact, plutôt qu’au relâchement du doigt. L’activation au clavier reste disponible et le clic de fin de contact ne déclenche pas une seconde attaque.
- Une seule commande offensive peut être mémorisée pendant 240 ms. La dernière pression remplace la précédente. Elle expire si l’attaque ne peut pas encore partir ; aucune longue séquence automatique n’est empilée. L’esquive, la pause, la perte de focus et le changement de monde annulent cette commande.
- L’esquive suit le mouvement demandé, normalise les diagonales et conserve son axe pendant le déplacement. Sans mouvement demandé, elle suit l’orientation du personnage.
- Une attaque rapide conserve 82 % de la vitesse de déplacement ; les autres attaques 58 %. Les animations offensives utilisent la durée calculée de l’arme.
- Les boutons utilisent les coûts calculés par le même code que le moteur, y compris les formes et l’amélioration artisan.
- Les impacts acceptés affichent brièvement leurs dégâts. Six indications au maximum sont conservées ; textures et matériaux sont libérés à leur expiration. Le compteur d’enchaînement n’apparaît qu’après plusieurs impacts rapprochés.

Le rendu des silhouettes reste stylisé. Cette modification ne livre ni personnages photoréalistes, ni huit compagnons supplémentaires, ni nouveaux ultimes. Une simulation de viewport mobile ne permet pas d’affirmer 60 images/seconde sur le Samsung réel. Aucune publication de cette version locale.
