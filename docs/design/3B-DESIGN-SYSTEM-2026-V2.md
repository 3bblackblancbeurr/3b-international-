# 3B — Luxury Digital Universe · Design System 2026 V2

## Décision propriétaire du 2 octobre 2026

**Une seule carte Passeport, sans aucun bouton ni lien dans la carte.** Le bouton circulaire « 3B MA VILLE » est retiré. La pluie Matrix bleue, les circuits animés, le balayage bleu, le portrait, les informations d’identité et les effets existants restent présents. « Créer ma ville » reste accessible depuis l’accueil. Les paramètres d’apparence demeurent hors de la carte.

## Direction commune

Noir obsidienne `#050607`, carbone `#0B0D0F`, champagne `#D6BC82`, reflet `#F0DDAF`, Matrix `#3BA7FF`. Le bleu signale une énergie ou une interaction; le champagne porte l’identité. Les couleurs canoniques et les fichiers de marque existants ne sont pas remplacés.

- Matières : carbone, métal champagne, verre sombre. Un seul reflet court au toucher/survol.
- Typographie : interface existante Inter/Sora avec repli système; titres éditoriaux sobres et accents Georgia. Aucune police distante supplémentaire.
- Contrôles : composants Gold Master, états actifs/pressés/désactivés, focus visible, cible tactile de 44 px.
- Cartes : contours fins, volumes sobres, hiérarchie par espacement, sans rotation permanente des textes.
- Icônes : Lucide existant, pas de nouveau pack.
- Son : synthèse locale brève, volume limité, désactivée par défaut, activation après interaction. Aucun fichier audio ni appel à un fournisseur.
- Vibrations : impulsion 7 ms quand le navigateur le permet, désactivable. Pas de promesse de fonctionnement sur chaque modèle Samsung sans test matériel.
- Mouvement : 160 ms au toucher, 250 ms pour une surface, 380 ms entre pages, 760 ms pour un portail. Intro 2,2 s maximum, bouton Passer, 180 ms aux visites suivantes.
- Moments majeurs : Secret confirmé par le serveur, changement réel de rang Passeport; le directeur cinématique existant conserve fragments, Gardiens, royaumes et progression du jeu.

## Surfaces livrées

| Surface | Implémentation |
| --- | --- |
| Accueil | Composition éditoriale, nouvelle illustration de la Cité Origine, hiérarchie et matières V2, accès ville séparé |
| Navigation | Navigation mobile et bureau harmonisée, menu animé, réglages Ambiance accessibles |
| Introduction | Noir, lumière, monogramme, poussières fines, passage et préférence de retour rapide |
| Passeport | Matrix conservée; zéro bouton; relief limité à 4°, reflet au pointeur, capteur opt-in depuis Ambiance, progression sur les vrais seuils de rang |
| Secret | Transitions de scène, pulsation discrète du signal, célébration seulement après succès serveur |
| Monde | Panorama illustré et atlas architectural 3D à la demande : huit architectures distinctes, Cercle Brisé, jardins, cascades, eau et 48 silhouettes; sélection par pays avec déplacement de caméra; arrivée courte dans le moteur existant |
| Boutique | Sources HD retrouvées et intégrées, cadrage centré sur le produit, reflets, lumière noir/blanc, détail agrandi et dialogue de zoom; prix et paiement inchangés |
| Communauté / membre | Matières communes sur les surfaces existantes; accès en préparation conservés |
| Chargements | Signature Gold Master, lisible sans mouvement |

L’atlas 3D est une présentation procédurale indépendante du monde sauvegardé. Il ne prétend pas être un nouveau Hub AAA final ni reconstruire l’art final des huit royaumes. Le jeu réel garde son moteur, ses missions, ses sauvegardes et son directeur cinématique. Les sources HD de boutique sont des rendus de présentation, pas des photographies de vêtements fabriqués. Voir `ART-PRODUCTION-V2.md` pour les fichiers livrés et leurs limites.

## Performance et accessibilité

- Aucun abonnement ni nouvelle dépendance de production. Une génération d’image intégrée; les sources produit sont réutilisées.
- Three.js est déjà utilisé dans le dépôt. L’aperçu est importé au choix de l’utilisateur, près du viewport; 30 images/s maximum, pixel ratio ≤ 1,4, géométries fusionnées par matériau et réutilisation des textures CC0 existantes.
- Repli sur le visuel Nexus lorsque WebGL est indisponible, l’économie de données activée, le téléphone annonce ≤ 4 Go de RAM, ou les mouvements sont réduits.
- Pause hors écran et en arrière-plan; destruction des renderers, géométries, écouteurs et timers à la sortie.
- Le gyroscope est optionnel; sa permission est demandée depuis une action explicite. Les mesures restent en mémoire sur l’appareil.
- La préférence système de mouvement réduit prévaut sur les effets. Les règles d’accès, secrets quotidiens, prix, paiements, Coins, XP, inventaire et données personnelles ne dépendent jamais d’une animation.

## Vérification et limite de livraison

Voir `validation-v2.md` pour les résultats de compilation, tests et contrôles du navigateur. Les captures utilisent un profil de démonstration, sans connexion à un compte réel. Les contrôles locaux ne remplacent pas la vérification finale du déploiement Vercel ni un essai sur le Samsung du propriétaire.

## Fichiers de référence

- `src/styles/gold-master.css` : palette et matières canoniques.
- `src/styles/luxury-v2.css` : présentation des surfaces et motion.
- `src/design-system/experience-policy.js` : durées, capacités, limites et pays.
- `src/design-system/LuxuryExperience.jsx` : réglages, entrée, transitions, feedback et reflets.
- `src/design-system/UniversePreview.jsx` / `universe-scene.js` : atlas visuel uniquement.
- `scripts/verify-luxury-browser.mjs` : recette locale avec services simulés.

Le retour arrière consiste à annuler le commit de cette refonte; aucune migration de base de données n’est nécessaire.
