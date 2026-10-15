# Santé 3B — 15 octobre 2026

## Expérience livrée

Une destination publique `#sante` dans le menu et les cartes de l’accueil existant. Chargement différé du module, cinq entrées : Aujourd’hui, Manger, Bouger, Récupérer, Corps. Les informations détaillées apparaissent dans des fiches modales, les sources dans un volet repliable. Les photos sont hébergées localement et leurs licences documentées.

- 26 aliments : préparation, usages, apports qualitatifs, précautions, saisons métropolitaines indicatives, recherche et favoris.
- 12 recettes : ingrédients, étapes, personnes ajustables, allergènes déclarés, filtres rapide/végétarien/allergène, calendrier d’un repas par jour et liste de courses consolidée/exportable.
- 12 guides : peau, soleil, mains, dents, pieds, sommeil, horaires décalés, marche, renforcement, pauses et respiration.
- Journal quotidien : pas manuels, estimations séparées, minutes d’activité, sommeil estimé, verres d’eau et portions de fruits/légumes ; vue des sept derniers jours et historique de 90 jours.
- Respiration de 1, 3 ou 5 minutes avec pause, arrêt, interruption en arrière-plan et respect de la réduction des mouvements.
- Aide française : 15, 112, 114 par SMS, 3114 et Santé.fr.

## Recherche produit

| Référence primaire | Usage étudié | Adaptation 3B |
| --- | --- | --- |
| [Samsung Health](https://www.samsung.com/fr/apps/samsung-health/) | Activité, sommeil, nutrition dans un même espace | Trois indicateurs simples, sources de saisie explicites |
| [Apple Santé](https://www.apple.com/fr/health/) | Vue de données et tendances | Journal personnel et semaine, sans score médical artificiel |
| [Yuka](https://yuka.io/application/) | Fiches explicatives et composition | Fiches sourcées et précautions, sans note universelle ni copie de sa base |
| [MyFitnessPal](https://www.myfitnesspal.com/fr) | Journal alimentaire et planification | Recettes, personnes, menu et courses, sans objectif calorique imposé |
| [Headspace](https://www.headspace.com/app) | Pauses et pratiques guidées | Respiration douce intégrée, commandes immédiates |

Revue parallèle réellement obtenue de Claude via la session utilisateur le 15/10/2026. Retenus : détails progressifs, aucune fausse mesure, pas de dogme 10 000 pas, pas de promesse détox, données facultatives, adaptation aux horaires décalés. Cette revue ne constitue pas une validation médicale. Les informations médicales ont été recherchées séparément dans les sources du registre `content-sources.md`.

## Données personnelles

Par défaut, les saisies sont en mémoire et disparaissent au démontage de la rubrique ou au rechargement. Le bouton de consentement explicite active la sauvegarde locale dans `threeb_health_local_v1`. Le journal est normalisé, limité aux 90 derniers jours au chargement et aux écritures, et n’est pas envoyé à un serveur. Export JSON et suppression avec confirmation intégrés. Le stockage du navigateur n’est pas chiffré par l’application : l’interface le précise et déconseille un appareil partagé.

La télémétrie de présence et les événements de navigation sont suspendus pour cette route. Aucun SDK de capture de session ni appel réseau pour les champs santé. Les services d’authentification, mises à jour et ressources générales de l’application existent toujours ; ne pas présenter toute l’application comme entièrement hors réseau.

## Podomètre : limites explicites

Le mode web utilise de vrais événements `DeviceMotionEvent` après action volontaire, avec détection de pics, temporisation et filtre. Il s’agit d’une **estimation expérimentale non étalonnée**, pas du capteur de pas natif. Le temps ne génère jamais de pas. La session est suspendue quand la page devient invisible et au changement de journée. Les permissions refusées et l’absence d’événements affichent un état explicite. La source manuelle et les estimations ne sont jamais additionnées implicitement.

Samsung Health, Health Connect et Apple HealthKit ne sont **pas connectés** dans cette livraison. Une intégration native, des permissions et une validation sur appareils restent nécessaires. Aucun test physique de précision sur Samsung/Xiaomi n’a été effectué ; ne pas revendiquer une précision clinique ni un suivi en arrière-plan.

Références : [MDN DeviceMotion](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static), [Health Connect](https://developer.android.com/health-and-fitness/health-connect/get-started).

## Périmètre

Information générale de prévention et bien-être pour adultes ; pas de diagnostic, ordonnance, télémédecine, analyse de lésion par photo, suivi médical automatisé ou régime thérapeutique. Une relecture par des professionnels de santé est nécessaire avant d’ajouter des fonctions cliniques personnalisées. Le contenu n’est pas présenté comme une encyclopédie médicale exhaustive.

Les 24 photos individuelles couvrent les aliments dont une correspondance libre et exacte a été vérifiée. Riz complet et pois cassés ont un visuel neutre explicitement nommé. Les photos des repas sont des ambiances, pas une promesse de résultat. Pas de cache hors-ligne complet revendiqué.
