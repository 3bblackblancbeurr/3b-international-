# Narration du Monde du 3B — 15 octobre 2026

Ce lot ajoute neuf enregistrements français, sans prétendre achever la production du jeu : huit arrivées dans les pays et un prologue optionnel de 28 secondes dans l’histoire d’accueil. Les récits suivent les textes canoniques existants. Les dialogues des autres scènes utilisent encore la voix du navigateur lorsqu’elle est disponible ; leurs textes restent visibles.

## Actifs et attribution

Les MP3 sont livrés localement sous `public/world/narration/fr/v1/`. Le manifeste `src/world/narration-manifest.json` conserve le texte exact, la durée mesurée avec ffprobe, la taille, l’empreinte SHA-256 et la page de génération. Aucun lien temporaire n’est utilisé en production.

Fournisseur : AIDOCMAKER.COM, voix synthétique de catalogue `deep`, génération le 15 octobre 2026. Aucun clonage de personne. Les textes sont fournis par le projet 3B. Aucun achat de crédits ni abonnement n’a été effectué.

Attribution visible dans le lecteur : [Voiceover Generated with AIDOCMAKER.COM](https://www.aidocmaker.com).

Conditions consultées le 15 octobre 2026 :
- https://www.aidocmaker.com/terms-of-service
- https://www.aidocmaker.com/pricing
- https://www.aidocmaker.com/docs/attribution-guidelines

L’offre gratuite exige l’attribution lors de l’usage public/commercial. Conserver le crédit lors de toute réutilisation de ces pistes. La présence d’une voix synthétique ne constitue pas une certification de droits sur l’ensemble du projet.

## Comportement

- Chronologie monotone commune à la caméra, la progression et la narration enregistrée ; aucune réduction du temps écoulé à faible FPS.
- Les pauses utilisateur, chargement et arrière-plan restent indépendantes.
- Passer, rejouer et quitter arrêtent immédiatement les voix précédentes.
- Le chargement d’une seule piste est limité à 1,8 seconde ; échec, son désactivé ou navigateur non déverrouillé : récit lisible, sans blocage ni démarrage tardif.
- Téléchargement plafonné à 768 Kio et cache décodé LRU plafonné à 8 Mio ; aucune prélecture des huit pays. Les 1,66 Mo de pistes disposent d’une enveloppe statique dédiée de 2 Mo ; le budget de 230 Mo des autres actifs reste inchangé.
- Si le texte d’une arrivée change, l’ancien enregistrement est automatiquement écarté.
- Les voix passent par le réglage voix et l’atténuation musicale existants.
- Le prologue n’est chargé qu’après ouverture de son lecteur ; il n’allonge pas l’entrée obligatoire dans le jeu.

## Validation et limites

Tests automatisés : 2 FPS/60 FPS, pauses cumulées, arrêt pendant chargement, délai de décodage, réponse 404, taille excessive, cache PCM, reprise et resynchronisation, correspondance de toutes les pistes avec les textes et leurs empreintes. Relecture du code effectuée avec Claude ; les décisions et tests restent sous responsabilité du projet.

La voix du navigateur reste dépendante de la plateforme ; sa reprise ne constitue pas une synchronisation mot à mot. La qualité subjective des voix et le comportement sur de vrais appareils Android/iOS restent à valider avec des joueurs. Ce lot ne fournit pas de nouveau film précalculé : les services vidéo consultés n’avaient pas de crédits disponibles. Les cinématiques sont rendues par le moteur du jeu.
