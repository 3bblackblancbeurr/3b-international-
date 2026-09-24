# 3B ORIGINS TV — architecture

3B ORIGINS TV est une chaîne linéaire intégrée à la même application web/PWA que 3B International.

Le contenu du manga reste indépendant : la télévision ne crée, ne modifie et ne fixe aucun épisode, durée ou découpage éditorial.

## Déjà prêt

- rubrique dédiée dans le menu 3B ;
- état préparation / antenne fermée / direct ;
- grille de programmes chargée à distance ;
- compte à rebours vers la prochaine diffusion ;
- synchronisation du lecteur sur l'heure réelle ;
- arrivée d'un spectateur au même point que les autres ;
- resynchronisation après retour d'onglet ou dérive du lecteur ;
- favoris locaux ;
- rappel navigateur facultatif pendant que l'application est active ;
- sous-titres via pistes WebVTT lorsqu'une source les fournit ;
- plein écran ;
- interface responsive web + PWA ;
- configuration prête pour un passage futur du mode programmé au mode continu ;
- aucun faux compteur d'audience.

## Régie

La grille par défaut se trouve dans public/origins-tv/schedule.json.

En production, VITE_ORIGINS_TV_SCHEDULE_URL peut pointer vers une grille distante afin de modifier la programmation sans republier l'application.

Chaque programme peut recevoir les champs id, title, label, startAt, endAt, poster, source, tracks et metadata.

La source peut être un fichier vidéo lisible par le navigateur ou un lecteur embarqué d'un fournisseur vidéo. Le fournisseur reste indépendant de l'interface.

## Évolution

1. Mode programmé : quelques fenêtres d'antenne.
2. Grille enrichie : plusieurs rendez-vous.
3. Mode continu : programmation permanente quand le catalogue le permet.

Le moteur d'interface reste le même entre les trois étapes.

## À connecter plus tard

Ces éléments nécessitent un service externe ou du contenu réel et ne doivent pas être simulés :

- hébergement/streaming vidéo de production ;
- vraies sources vidéo ;
- notifications push quand l'application est totalement fermée ;
- compteur d'audience en temps réel ;
- Chromecast/AirPlay avancé ;
- console d'administration protégée pour éditer la grille ;
- CDN, DRM ou contrôle d'accès si le catalogue l'exige.
