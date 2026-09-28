# Monde du 3B + Créer ma Ville — architecture séparée

## Décision produit

Le Monde du 3B et Créer ma Ville sont deux jeux différents dans le même écosystème 3B.

**Passeport 3B**
- ouvre le **Monde du 3B** : aventure / open world ;
- ouvre **Créer ma Ville** : city-builder / gestion.

Ils partagent l'identité du compte et les garde-fous de sécurité, mais **pas leur progression de gameplay**.

---

## Monde du 3B

Le Monde du 3B conserve son propre canon et sa propre progression :

- Kaïs ;
- le Cercle Brisé ;
- le Monstre de l'Oubli ;
- les huit pays et les huit valeurs ;
- les huit Gardiens ;
- le Hub / Cité des Huit Héritages ;
- missions, journal, secrets et événements ;
- PNJ, dialogues, routines et mémoire ;
- transports et navigation ;
- météo, cycle du jour, eau, végétation et éclairage ;
- exploration, ressources, refuges et expéditions ;
- combat et progression ;
- coopération ;
- sauvegarde liée au compte ;
- évolution du Hub selon l'histoire du Monde.

Aucune mission, aucun Souvenir, aucun Gardien et aucun royaume du Monde n'est requis pour créer ou développer une Ville 3B.

L'ancien runtime Origins reste seulement comme source historique dans le dépôt. Le Monde public utilise un seul runtime officiel.

---

## Créer ma Ville

Créer ma Ville est un city-builder indépendant.

### Accès

**Passeport 3B valide → Créer ma Ville → jouer immédiatement.**

Aucun passage par le Monde du 3B n'est requis.

### Fondation existante

Le système conserve :

- une ville persistante par compte ;
- carte urbaine map-first ;
- huit quartiers ;
- niveau de ville ;
- niveau de terrain ;
- Coins serveur ;
- catalogue de bâtiments ;
- placement et déplacement ;
- rotation ;
- collisions ;
- sauvegarde serveur ;
- mutations idempotentes ;
- brouillon local ;
- annuler / rétablir ;
- routes personnalisées persistantes ;
- eau et zones protégées ;
- parcs et catégories urbaines ;
- inventaire permanent ;
- objets exposés ;
- véhicules et tenues ;
- visibilité privée / amis / publique ;
- découverte et visite d'autres villes ;
- indicateurs Habitants / Emplois / Mobilité / Services / Nature / Équilibre urbain.

---

## Progression autonome de la Ville

La progression de la Ville vient uniquement du city-builder.

Boucle cible :

**construire → améliorer → tracer des routes → développer les services → augmenter le niveau de ville → agrandir le terrain → ouvrir de nouveaux quartiers et bâtiments.**

Le serveur calcule la progression à partir de l'état réel de la ville : constructions placées, améliorations, routes, expositions et activité de la ville.

Les quartiers s'ouvrent progressivement avec le niveau de ville. Ils ne sont plus liés aux Sceaux, Souvenirs ou Gardiens du Monde du 3B.

---

## Règles de séparation

1. Le Monde du 3B ne débloque pas la Ville.
2. Le Monde du 3B ne débloque pas les quartiers de la Ville.
3. Créer ma Ville ne modifie pas l'histoire de Kaïs.
4. La progression Ville n'accorde pas de Sceau, Souvenir ou victoire dans le Monde.
5. Les deux expériences peuvent utiliser le même Passeport, la même authentification et les mêmes protections serveur.
6. Les anciens ponts Monde → Ville restent au maximum comme compatibilité technique interne et ne doivent plus piloter le gameplay.

---

## Direction city-builder

Les prochaines couches se construisent dans cet ordre :

1. **Construction**
   - bâtiments ;
   - routes ;
   - déplacement / rotation ;
   - rangement sécurisé ;
   - parcelles et extensions.

2. **Ville vivante**
   - habitants ;
   - circulation ;
   - emplois ;
   - besoins ;
   - commerces ;
   - services ;
   - événements.

3. **Gestion**
   - budget de ville ;
   - entretien ;
   - satisfaction ;
   - densité ;
   - transports ;
   - équilibre résidentiel / emploi / services.

4. **Rendu premium**
   - vraie lecture de carte ;
   - bâtiments 3D plus riches ;
   - circulation visible ;
   - animations ;
   - cycle jour / nuit ;
   - météo ;
   - performances mobile / PC.

Le principe reste : le joueur doit comprendre immédiatement **où il construit, ce qui manque et comment sa ville progresse**.
