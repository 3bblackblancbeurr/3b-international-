# La Porte interdite — refonte du 11 septembre 2026

La carte « La Tour des portes interdites » devient « La Porte interdite ». L'identifiant interne `tower` conserve les records et la liaison aux récompenses 3B.

## Jeu
- 100 niveaux séquentiels en dix chapitres. Trois salles au début, quatre dès le niveau 26, cinq dès le niveau 61, puis un gardien final tous les dix niveaux.
- Trois portes inspectables à chaque seuil : combat au tour par tour avec intentions annoncées, énigme déductive à solution unique, mécanisme de précision.
- Concentration, garde, riposte, brise-garde et interruption. Les ennemis attendent la décision du joueur ; un ennemi vaincu ne riposte pas.
- Une bénédiction non répétable après chaque sceau : vitalité, concentration ou puissance pour ce niveau.
- Trois étoiles : terminer, aucune erreur, aucun élixir. Talents permanents après 10, 25, 50 et 75 victoires distinctes.
- Sauvegarde entre les salles, après les bénédictions et devant la Porte. Une épreuve quittée reprend au dernier seuil. Import/export compatible avec les anciennes sauvegardes.
- XP et points du compte par le service existant, uniquement pendant le jeu actif. Aucun score ou import ne crédite d'XP.

## Présentation et accès
Décor original, sentinelle en quatre poses et Kaïs illustré déjà approuvé. Images WebP, animation à pas fixe et affichage Canvas sans déformer les personnages. Interface clavier/tactile, pause automatique au changement d'onglet, son facultatif, navigation de dialogue et réduction des mouvements.

## Vérifications
- 110 tests dédiés, dont résolution des 100 niveaux via les trois épreuves et les dix gardiens.
- Suite du dépôt avant intégration des changements Paris : 289 tests réussis.
- Parcours navigateur complet du niveau 1 : ordinateur 1440×1000, téléphone 390×844, paysage 844×390. Trois étoiles, niveau suivant et reprise après rechargement vérifiés.
- Niveau 100 : cinq runes sur 320×740, gardien final gagnable, contrôles en paysage visibles, campagne terminée.
- Récompenses de compte vérifiées avec une fixture réseau isolée : affichage des gains, arrêt pendant la pause, navigation vers les avantages. Aucun compte réel crédité par les tests.
- Compilation Vite réussie. Avertissements préexistants sur les gros bundles de l'application.

## Illustrations intégrées
- `public/games/forbidden-hall.webp` : 1536×1024, 512664 octets.
- `public/games/forbidden-guardian.webp` : 1774×887, alpha réel, 485096 octets.
- `src/games/door-art.js` : découpes des quatre poses.
- `public/games/kais-explorer.webp` : personnage existant réutilisé sans modification.

### Prompt du décor
Use case: stylized-concept. Production environment artwork for a premium illustrated adventure video game named La Porte interdite. A magnificent mysterious underground sanctuary, viewed straight on from a slightly elevated camera, richly painted realistic fantasy architecture with beautiful stone carving, aged bronze, dark navy stone, dusty violet shadows and warm amber firelight. EXACTLY THREE equally large monumental doors stand side by side, each entirely contained in its own equal-width third of the image. Left door: tall bronze armored gate carved with a guardian's mask, copper-red light in the seams, two small warm braziers. Middle door: exquisite dark carved stone doorway bearing delicate celestial sun moon star symbols, cool blue-violet light. Right door: finely crafted circular brass locking mechanism set in a tall door, interlocking geometric rings, warm amber glow. Strong coherent architectural perspective; doors fill the upper two thirds, a beautifully detailed stone floor spans the lower third with quiet space for game characters. Premium hand-painted AAA adventure art, sophisticated lighting, crisp intricate readable material detail, clearly differentiated doors. No characters, no monster, no writing, no text, no letters, no numbers, no UI, no floating icons, no borders. Wide landscape composition around 1536x1024. This image will be an actual game background and its three thirds will be used as illustrated door choices. Keep the doors aligned and equal in scale; no door cut off by an image edge.

### Prompt de la sentinelle
Use case: stylized-concept. Create an actual transparent PNG game sprite strip with FOUR full-body poses of the SAME magnificent ancient stone-and-bronze guardian for a premium hand-painted adventure game. Four evenly spaced equal-width cells, single horizontal row, invisible grid. Elegant powerful humanoid sentinel, complete anatomically convincing body, articulated carved dark stone limbs, layered aged bronze armor, subtle blue-violet glowing seams, beautiful solemn bronze mask with small amber eyes, broad shoulders, ornamental chest piece, heavy boots, short dark fabric skirt panels. A believable impressive temple guardian, NOT a toy, NOT a robot made of boxes, NOT a horror monster, no weapon, no gore. Hand-painted 3D fantasy quality with fine etched bronze and sculpted stone, crisp high-detail silhouette, warm rim light and cool soft fill. Camera fixed orthographic slight view from above about 20 degrees. Faces toward screen LEFT in a front-left three-quarter stance in all four cells. Pose 1: calm battle-ready idle, both feet planted; pose 2: winding up a heavy punch with one armored fist raised; pose 3: arms crossed in a strong defensive guard; pose 4: recoil from impact, torso leaning back slightly but feet still planted. Same proportions, same design, same lighting, same scale and foot baseline across every pose. All heads and boots fully inside each cell with generous transparent padding, no overlap. Transparent background with actual alpha, no checkerboard baked into the image, no background color, no floor, no cast shadow outside the figure, no labels or writing. Wide landscape image around 1536x1024 or wider with tall figures in four columns, high-quality clean game artwork.

