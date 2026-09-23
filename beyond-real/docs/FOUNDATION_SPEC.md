# 3B Beyond Real — Foundation Specification v0.4

## 1. Mission

3B Beyond Real est la future couche de réalité mixte / XR de l'univers 3B.

But : **faire sortir l'univers 3B de l'écran pour l'intégrer au monde réel, puis permettre le passage vers une immersion complète du Monde du 3B**.

Le projet n'est pas un casque. Le matériel est un support. La valeur 3B doit rester dans le logiciel, l'univers, l'identité du joueur, la mémoire des personnages et les expériences.

---

## 2. Priorité produit

La priorité reste :
1. finir 3B International ;
2. stabiliser compte / Passeport / Supabase ;
3. finir correctement le Monde du 3B ;
4. réutiliser ces bases dans Beyond Real.

La branche Beyond Real ne doit pas ralentir ou casser `main`.

---

## 3. Audit de réutilisation du dépôt actuel

### Déjà réutilisable

**Passeport** — `src/passport/identity.js` dérive un identifiant de Passeport stable depuis l'utilisateur. Beyond Real doit utiliser ce même utilisateur, jamais créer une seconde identité.

**Sauvegarde Monde** — `src/world/save.js` possède déjà un journal offline par appareil, une séquence monotone et une réconciliation serveur. Beyond Real reprend ce principe pour ses événements offline.

**Autorité serveur** — `supabase/world-engine.sql` réserve les mutations fiables au serveur, avec révision et séquence par appareil. Beyond Real applique la même règle aux fragments, quêtes, XP, succès et inventaire.

**Canon** — `src/world/story-canon.js` définit Kaïs, les huit Gardiens et les huit valeurs. Le registre Beyond Real est testé contre ce canon.

**Portes** — le Monde du 3B possède déjà les huit régions et des portails de gameplay. Leur identité est réutilisable ; leurs coordonnées actuelles ne le sont pas pour la MR.

### Ce qui manquait

- IDs universels hors cartes `Cxxx` ;
- enveloppe d'événements commune ;
- mémoire PNJ longue durée structurée ;
- objet spatial indépendant de son ancre matérielle ;
- abstraction XR par capacités ;
- simulateur de pièce ;
- validateur d'assets ;
- règles de confidentialité spatiale.

---

## 4. Architecture

### Couches

1. **Domain** : IDs, événements, mémoire, règles de progression.
2. **Spatial Core** : pièce, sécurité, Porte, REAL SPACE / WORLD SPACE.
3. **XR Abstraction** : besoins en capacités.
4. **Platform Adapters** : OpenXR, Android XR, Meta, visionOS, autres si nécessaire.
5. **3B Bridges** : Passeport, Monde du 3B, backend.
6. **Presentation** : rendu, audio, UI, interactions.

### Règle de dépendance

Le Domain ne doit jamais importer Meta, Google, Apple, Unity ou Unreal.

Le cœur demande :
- planes ou room mesh ;
- anchors ;
- persistent anchors ;
- passthrough ;
- hands/controllers ;
- spatial audio.

Il ne décide pas du gameplay à partir du nom d'une marque.

---

## 5. Moteur

La fondation reste **engine-agnostic**.

Unity offre actuellement XR Simulation / AR Foundation et peut accélérer un prototype sans casque.

Unreal est déjà présent dans l'écosystème 3B et supporte OpenXR sur appareils head-mounted.

Le choix final du moteur pour Prototype 001 sera repris lorsque :
- Kaïs 3D canonique existe ;
- les assets du Monde du 3B sont connus ;
- un casque cible est choisi ;
- les plugins MR réellement nécessaires sont testables.

Ne pas figer aujourd'hui un choix qui obligerait à dupliquer tout le Monde du 3B.

---

## 6. Registre canonique

Exemples :
- `character.kais`
- `world.france`
- `portal.france`
- `guardian.france.celiane`
- `fragment.justice`

Règle : la même entité garde le même ID dans le Monde du 3B, Beyond Real, le Passeport et les services serveur.

---

## 7. Événements

Les systèmes 3B communiquent avec une enveloppe versionnée.

Exemples :
- `PORTAL_OPENED`
- `NPC_MET`
- `NPC_HELPED`
- `NPC_BETRAYED`
- `FRAGMENT_FOUND`
- `GUARDIAN_DEFEATED`
- `ITEM_PLACED`
- `SPATIAL_ANCHOR_LOST`

Les événements de progression durable sont **server-authoritative**.

Le client peut observer une Porte ouverte ; il ne peut pas s'accorder lui-même un fragment ou un succès sensible.

---

## 8. Memory Engine

La mémoire PNJ possède :
- ID ;
- personnage ;
- type ;
- importance ;
- date ;
- résumé ;
- faits structurés ;
- conséquences relationnelles ;
- drapeau permanent.

Dimensions initiales :
- confiance ;
- respect ;
- peur ;
- dette.

Les événements majeurs peuvent être permanents.

La mémoire ne remplace pas la personnalité.

Réaction future =
**personnalité + mémoire + relation + objectif + contexte**.

L'IA générative pourra formuler un dialogue, mais ne sera jamais la source de vérité de l'histoire.

---

## 9. Passport Bridge

Le Foundation Kit ne modifie pas le vrai Passeport.

Il contient un bridge simulé qui prouve :
- idempotence ;
- anti-doublon ;
- autorité serveur pour les récompenses ;
- séparation entre événement et mutation de compte.

Plus tard :
`Beyond Real -> endpoint serveur -> validation -> Passeport 3B`.

Jamais :
`client XR -> modification directe XP/inventaire`.

---

## 10. Objet logique vs ancre

Décision non négociable :

**un objet 3B n'est pas son ancre XR**.

Exemple :
- objet logique : `fragment.justice`
- instance : `fragment-justice-instance-001`
- ancre locale : `anchorRef`

Si l'ancre disparaît après reset, changement d'appareil ou perte de tracking :
- le fragment reste au joueur ;
- l'instance passe en `needs-relocation` ;
- on demande de le replacer.

On ne détruit jamais l'exploit parce qu'une ancre locale est perdue.

---

## 11. REAL SPACE / WORLD SPACE

### REAL SPACE
Position réelle du corps dans la pièce.

### WORLD SPACE
Position dans le Monde du 3B + offset physique local.

Stratégie de locomotion :
- mouvements proches : corps réel ;
- grandes distances : locomotion artificielle choisie par le joueur ;
- Porte : frontière claire entre MR et immersion complète.

---

## 12. Placement de Porte

Ordre :
1. vraie porte compatible et sûre ;
2. sinon mur libre ;
3. sinon aucun placement.

Vérifications :
- largeur ;
- hauteur ;
- marge latérale ;
- zone libre devant la Porte ;
- mobilier ;
- murs interdits ;
- plafond.

Aucun système ne doit forcer une Porte dangereuse.

---

## 13. Simulateur PC / Prototype 000

Flux :
1. pièce simulée ;
2. recherche d'une Porte ;
3. ouverture Porte France ;
4. première rencontre Kaïs ;
5. création d'un souvenir permanent ;
6. acquisition serveur simulée du Fragment Justice ;
7. placement du fragment ;
8. sauvegarde ;
9. fermeture / reload ;
10. fragment retrouvé ;
11. exploit Passeport simulé.

Le simulateur ne prétend pas reproduire le tracking réel. Il valide la logique indépendante du matériel.

---

## 14. Bibliothèque de pièces

20 scénarios fixes :
- petite chambre ;
- salon normal ;
- grande pièce ;
- encombrée ;
- aucune porte ;
- joueur assis ;
- plafond bas ;
- mur interdit ;
- pièce étroite ;
- vraie porte bloquée ;
- plusieurs portes ;
- mobilier en angle ;
- table centrale ;
- pièce large et peu profonde ;
- meuble haut ;
- studio vide ;
- plusieurs obstacles ;
- micro pièce ;
- pièce longue ;
- plusieurs ouvertures.

Plus génération déterministe de pièces pour fuzz-tests.

Chaque bug réel trouvé plus tard doit devenir une fixture permanente.

---

## 15. Assets 3D

Chaque asset important doit fournir un manifest :
- ID canonique ;
- type ;
- unités mètres ;
- pivot ;
- collision séparée ;
- LODs ;
- matériaux PBR ;
- budget texture ;
- statut.

Personnages :
- rig canonique ;
- idle ;
- walk ;
- turn ;
- look ;
- interact ;
- dialogue.

Ne pas figer maintenant un nombre universel de polygones. Les budgets réels seront mesurés sur le futur appareil cible.

---

## 16. Sécurité / confidentialité

### Local-only par défaut
- mesh de la maison ;
- planes ;
- positions fines des meubles ;
- images passthrough ;
- anchor handles locaux ;
- tracking brut mains/yeux/corps.

### Synchronisable
- userId ;
- ID logique d'objet ;
- succès ;
- quête ;
- état mémoire utile ;
- version de schéma ;
- diagnostic minimal.

### Menaces
- faux événement de récompense ;
- replay ;
- vol de session ;
- fuite de scan de domicile ;
- corruption offline ;
- perte d'ancre ;
- injection IA ;
- télémétrie excessive.

Règles :
- idempotence ;
- serveur autoritaire ;
- minimisation ;
- pas de vidéo/audio brut dans les logs ;
- versionnement et migration de toute donnée persistante.

---

## 17. Offline

File locale :
- `deviceId`
- séquence monotone
- événements en attente
- accusé serveur

Même principe que le Monde actuel : le joueur ne doit pas perdre son action simplement parce qu'Internet coupe.

---

## 18. IA personnages

Pipeline :
`faits validés -> mémoire structurée -> personnalité/objectifs -> décision -> formulation`.

L'IA peut :
- formuler dialogue ;
- choisir une intention autorisée ;
- exprimer une émotion ;
- résumer un souvenir.

L'IA ne peut pas :
- donner un fragment ;
- terminer une quête ;
- inventer un souvenir permanent ;
- réécrire l'histoire ;
- appeler une action serveur arbitraire.

---

## 19. Multijoueur futur

Préparer seulement les identités :
- playerId ;
- worldSessionId ;
- spatialObjectId ;
- logicalObjectId ;
- roomOwnerId ;
- objectOwnerId ;
- anchorRef local.

Ne pas supposer qu'une ancre est partageable entre appareils ou marques.

Le partage réel demandera plus tard une solution de co-localisation.

---

## 20. Performance

Ne pas fixer maintenant un budget final pour un casque non choisi.

Mesures obligatoires au Device Lab :
- CPU frame time ;
- GPU frame time ;
- P95/P99 ;
- mémoire ;
- draw calls ;
- triangles visibles ;
- coût transparence Porte ;
- temps de localisation ancre ;
- temps chargement ;
- pertes tracking ;
- throttling si exposé.

Règle : stabilité du framerate avant quantité d'effets.

---

## 21. Audio

Préparer :
- audio 3D ;
- direction ;
- distance ;
- occlusion ;
- transition audio réel -> royaume ;
- voix de Kaïs spatialisée ;
- sous-titres et repères sonores accessibles.

---

## 22. QA

Batterie Foundation :
- canon ;
- IDs ;
- événements ;
- server authority ;
- idempotence Passport ;
- mémoire longue ;
- bornes relation ;
- Porte réelle ;
- fallback mur ;
- refus pièce impossible ;
- fuzz 1 000 pièces ;
- REAL/WORLD SPACE ;
- perte d'ancre ;
- offline ;
- reload Prototype 000 ;
- assets ;
- capability gating.

### Gates

**G1 Foundation** — tests verts, aucune importation par l'app.

**G2 Engine Simulation** — même flux dans un moteur avec XR Simulation/éditeur.

**G3 Device Prototype** — vrai passthrough, vraie pièce, vraie ancre, relance.

**G4 Premium Vertical Slice** — Kaïs, Porte, Fragment, audio, performance, Passeport sandbox.

**G5 Production Candidate** — privacy review, threat model, matrice appareils, migrations, accessibilité, tests utilisateurs.

Stop rule : si une gate n'est pas verte, ne pas masquer le problème en ajoutant du contenu.

---

## 23. Organisation type studio

Responsabilités :
- Product/Creative ;
- Architecture ;
- XR ;
- Gameplay ;
- Backend ;
- AI/Characters ;
- 3D/Tech Art ;
- Audio ;
- Security/Privacy ;
- QA.

Une même personne peut porter plusieurs rôles, mais les responsabilités restent distinctes.

Definition of Done :
1. contrat écrit ;
2. test ;
3. fallback ;
4. donnée classifiée ;
5. migration si persistance ;
6. pas de dépendance constructeur dans Domain.

---

## 24. ADR de base

### ADR-001
Foundation engine-agnostic, OpenXR-first pour appareils compatibles.

### ADR-002
Données spatiales local-first.

### ADR-003
Objet logique séparé de son ancre.

Ces décisions peuvent être révisées uniquement avec une raison mesurée, pas par préférence de marque.

---

## 25. Ce qu'on ne fait pas maintenant

- pas de casque 3B ;
- pas de huit royaumes XR ;
- pas de multijoueur spatial ;
- pas de gros système de combat XR ;
- pas de duplication Kaïs MR ;
- pas de migration du vrai Passeport ;
- pas de dépendance à un seul constructeur.

---

## 26. Prochaine étape autorisée

Quand 3B International le permet sans ralentissement :

**Prototype 000.5 dans un moteur** :
- pièce XR simulée ;
- Porte placeholder ;
- Kaïs placeholder ;
- Fragment placeholder ;
- transition REAL/WORLD ;
- persistance simulée.

Le vrai Prototype 001 attendra les gates produit et matériel.
