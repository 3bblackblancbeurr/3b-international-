# Monde 3B — netteté mobile et gels pendant la course

## Périmètre et version de départ

Le signalement du 15 octobre concerne un Xiaomi flou et un Samsung S21 net
qui se bloque 2–3 secondes après quelques secondes de course. Le modèle du
Xiaomi et les versions du navigateur/application ne sont pas connus.
La production Vercel a été vérifiée sur `ee6f37791832` ; la PR #532 du
14 octobre n'était pas fusionnée. Ce correctif repart de cette production et
reprend les corrections techniques utiles de #532. La validation artistique
de cette PR reste séparée. La priorité du prochain donneur de mission est
également reprise après reproduction de son absence par le test de navigation.

## Défauts démontrés et corrections

1. La production traitait 30 FPS comme une surcharge (seuil 45 FPS), puis
   multipliait encore par 0,6 le plafond du mode fluide : sur un téléphone
   ordinaire, la résolution pouvait tomber à 60 % des dimensions CSS.
   Les mobiles utilisent maintenant un seuil de surcharge à 27 FPS et des
   paliers absolus. Dix minutes simulées à 30 FPS ne dégradent pas l'image.
2. Réduire seulement les pixels ne réduit pas le travail des ombres, de la
   population ou du terrain. Après trois fenêtres surchargées, le budget fluide
   s'applique d'abord **à résolution inchangée**. Les paliers de résolution
   servent ensuite si la surcharge persiste. La reprise restaure la netteté
   avant les effets, à l'arrêt, avec délai et hystérésis.
3. Les réapplications de qualité identique relançaient du travail terrain ;
   certains remplacements de même LOD conservaient la mauvaise tessellation.
   Les profils identiques sont ignorés et les remplacements restent progressifs.
   Le canvas n'est redimensionné que si ses dimensions ou son ratio changent.
4. Le diagnostic du candidat associait un grand intervalle aux temps CPU de
   l'image suivante. Il conserve maintenant les mesures de l'image précédente,
   y compris terrain/quartier, rendu et préparation de l'interface.
   `betweenFramesMs` est le temps restant hors de la boucle mesurée : **ce n'est
   pas une mesure GPU** ni la preuve d'un problème de pilote.
5. Un simple délai de démarrage n'excluait pas un chargement plus long.
   Les mesures et l'adaptation attendent la fin réelle des actifs initiaux,
   avec une courte période de stabilisation. Pause, changement de pays et
   arrière-plan coupent l'intervalle en cours.

6. Le roulement journalier pouvait masquer Inès, nécessaire à la mission
   suivante. Le prochain donneur de mission déverrouillée garde une place
   prioritaire dans la limite mobile inchangée de 18 personnages.

Le relevé JSON v2 est local, limité aux 20 derniers gels et contient le build
pour distinguer les versions. Il ne contient ni identité, ni sauvegarde, et
n'est pas transmis automatiquement.

## Vérifications et limites

Tests du contrôleur et de l'attribution temporelle ; test navigateur du vrai
WorldPage en portrait/paysage (surcharge simulée, reprise, modes manuels,
export) ; vrai moteur Hub/France avec sprint et gel de rendu artificiel de
450 ms pour vérifier l'attribution. Le gel injecté est clairement séparé des
mesures ordinaires dans le rapport. Le GPU de test est SwiftShader logiciel.

Aucune de ces vérifications ne prouve la disparition du gel sur le S21 ou la
netteté sur le Xiaomi physique. Les séquences de génération de végétation,
compilation de shaders, allocations React et pilote GPU restent des pistes,
pas des causes établies du signalement. Aucun changement de moteur ou retrait
arbitraire de bâtiments n'a été effectué sur cette base.

La tentative de nouvelle revue Claude a été bloquée avant transmission par
le contrôle automatique d'autorisation. Aucun avis Claude du 15 octobre ne
fait partie de la validation ; les conclusions du 14 restent historiques.

## Vérification sur téléphone après livraison

Installer la mise à jour, choisir Qualité graphique → Adaptative, puis courir
sur le même trajet dans le Hub et en France. Tester à froid puis pendant
20 minutes, avec rotation, pause et reprise. Si le gel revient : Pause →
État du rendu → Télécharger le relevé de fluidité. Vérifier le `buildId`,
le nombre d'événements et leurs temps avant de cibler une autre correction.
Ne pas effacer le stockage de l'application pour effectuer ce test.

## Résultats de cette session

- Candidat d'intégration avec priorité des missions : 2 437 tests réussis,
  aucun échec, 1 test ignoré ; build réussi.
- Extraction depuis la production : 2 435 réussites, 1 échec, 1 ignoré.
  L'échec reproduisait l'absence du donneur de mission. Sa correction exacte
  du candidat a été réintégrée ; les 42 tests ciblés, dont le scénario en
  échec et 28 jours de roulement des personnages, passent ensuite.
- Version corrective finale : build réussi ; navigateur portrait et paysage
  réussis, export v2 incluant buildId validé ; rendu Hub/France, sprint et
  attribution du gel injecté réussis, sans erreur script/shader. Captures vues.
- Une exécution supplémentaire concurrente de verify a échoué sur quatre
  fichiers de tests de base de données ; ils passent dans l'exécution complète
  séparée. Cette exécution concurrente n'est pas comptée comme une réussite.
- Les relevés navigateur sont dans mobile-validation-20261015.json. La charge
  du point d'entrée France reste importante (plusieurs millions de triangles,
  passes comprises). Aucun FPS mesuré ici n'est une mesure du Samsung S21.

## Livraison

Le push GitHub a été refusé par le contrôle automatique demandant un accord
explicite pour la publication. Aucune branche distante créée ni modification
de production confirmée dans cette session. Après autorisation : envoyer la
branche corrective, créer la PR, attendre les contrôles distants, puis publier
et vérifier version.json sur l'URL publique.
