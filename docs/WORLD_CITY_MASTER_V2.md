# Monde 3B + Ville 3B — Master V2

## Décision produit

Le joueur ne doit plus avoir l'impression d'utiliser plusieurs prototypes.

Il existe désormais une seule expérience publique :

**Passeport 3B → Monde du 3B → premier Souvenir → Ville 3B → progression croisée Monde/Ville.**

L'ancien runtime Origins reste dans le dépôt uniquement comme référence historique et filet de sécurité technique. Il n'est plus une destination publique.

---

## Ce qui existe réellement aujourd'hui

### Monde du 3B

Le runtime officiel contient déjà :

- un Hub / Cité des Huit Héritages ;
- les huit pays et leurs valeurs ;
- Kaïs, les Gardiens et le Monstre de l'Oubli ;
- missions, journal, secrets et événements ;
- PNJ, dialogues, routines et mémoire ;
- transports et navigation ;
- météo, cycle du jour, eau, végétation et éclairage ;
- interactions contextuelles ;
- exploration, ressources, refuges et expéditions ;
- combat et progression ;
- coopération ;
- sauvegarde liée au compte ;
- progression du Hub selon les héritages restaurés ;
- pont serveur vers Ville 3B.

Le Hub officiel est dimensionné comme une métropole et non comme un petit menu 3D.

### Déblocage Ville 3B

Ville 3B reste une récompense du Monde.

Le déblocage officiel est lié au **premier Souvenir** :

1. traverser une Porte ;
2. aider l'habitant du pays ;
3. éveiller les trois pouvoirs ;
4. résoudre le monument ;
5. éveiller le premier Souvenir.

Après cela, l'accès Ville 3B est permanent.

### Ville 3B

La fondation technique existe déjà :

- une ville persistante par compte ;
- huit quartiers ;
- niveau de ville et niveau de terrain ;
- Coins et XP serveur ;
- catalogue de bâtiments ;
- placement, déplacement et rangement ;
- rotation ;
- contrôle de collision ;
- sauvegarde serveur ;
- idempotence des mutations ;
- brouillon local de reprise ;
- annuler / rétablir ;
- inventaire permanent ;
- objets exposés ;
- véhicules / tenues ;
- visibilité privée / amis / publique ;
- découverte et visite d'autres villes ;
- synchronisation Monde → Ville.

---

## Ce que Master V2 change

### 1. Un seul Monde public

WorldEntry ouvre toujours le Monde 3B actuel.

Il n'existe plus de bascule publique vers une ancienne version du monde.

### 2. Ville 3B devient map-first

La première chose visible dans la ville est maintenant son **plan urbain**, pas un écran de statistiques.

La carte possède :

- le Cœur 3B central ;
- huit quartiers identifiables ;
- anneaux routiers ;
- grands boulevards ;
- axes radiaux ;
- côte / eau ;
- zones vertes ;
- bâtiments positionnés avec leurs vraies empreintes serveur ;
- catégories visuelles de bâtiments ;
- quartiers verrouillés / ouverts ;
- zoom, recentrage et déplacement de vue ;
- placement sur la carte ;
- aperçu privé basé sur la même carte.

Les coordonnées, collisions, coûts et sauvegardes restent autoritaires côté serveur.

---

## Boucle de jeu cible

### Début

**Passeport → Hub → Kaïs → Porte → première mission → premier Souvenir**

### Fondation

Le Souvenir débloque :

**Fonder ma Ville 3B**

Le joueur choisit son nom, puis arrive directement sur sa carte.

### Boucle continue

**Explorer le Monde**
→ restaurer un héritage
→ gagner progression / objets
→ synchroniser Ville 3B
→ débloquer ou améliorer un quartier
→ construire / aménager
→ revenir dans le Monde.

La ville doit devenir le journal visuel des accomplissements du joueur.

---

## Ville 3B — cible city-builder complète

La carte actuelle est la fondation du city-builder. Les prochaines couches doivent être ajoutées dans cet ordre :

1. **Voir et comprendre la ville**
   - routes ;
   - quartiers ;
   - bâtiments ;
   - terrains ;
   - eau ;
   - parcs ;
   - points d'intérêt.

2. **Construire**
   - bâtiments ;
   - déplacement / rotation ;
   - bulldozer = rangement sécurisé ;
   - placement tactile ;
   - prévisualisation avant validation.

3. **Urbanisme**
   - routes éditables ;
   - carrefours ;
   - zonage résidentiel / commerce / services ;
   - parcs ;
   - transports ;
   - parcelles et extensions.

4. **Ville vivante**
   - habitants ;
   - circulation ;
   - besoins ;
   - emplois ;
   - fréquentation ;
   - commerces ;
   - événements.

5. **Économie**
   - budget de construction ;
   - coûts contrôlés serveur ;
   - revenus internes équilibrés ;
   - aucun paiement réel nécessaire pour progresser.

6. **Identité 3B**
   - les huit quartiers restent reliés aux huit héritages ;
   - les récompenses du Monde ont des effets visibles ;
   - les bâtiments 3B officiels restent des repères permanents.

---

## Direction visuelle

Le rendu doit être premium mais fonctionnel.

À éviter :

- écran générique « IA » ;
- accumulation de néons sans hiérarchie ;
- cartes décoratives qui remplacent la carte réelle ;
- faux chiffres ou faux états ;
- effets glassmorphism qui réduisent la lisibilité ;
- design différent à chaque sous-page.

À conserver :

- noir profond ;
- champagne ;
- bleu Matrix comme accent ;
- matériaux urbains ;
- carte lisible ;
- contraste mobile ;
- profondeur et lumière au service du gameplay.

---

## Qualité et sécurité

Toute évolution Monde/Ville doit continuer à passer :

- tests application ;
- Fortress Security ;
- build Android ;
- build iOS ;
- contrôle des secrets ;
- audit dépendances ;
- authentification réelle ;
- mutations sensibles côté serveur ;
- limitation de débit ;
- validation des coordonnées / collisions / coûts côté serveur ;
- accessibilité clavier et mobile quand le format le permet.

Aucun visuel premium ne doit remplacer ces garde-fous.

---

## Définition de « fini »

Le Monde 3B n'est pas considéré fini parce qu'il possède beaucoup de modules.

Il est fini lorsque le joueur peut :

1. créer son Passeport ;
2. entrer dans le Monde sans ancienne version concurrente ;
3. comprendre Kaïs, le Cercle Brisé et son premier objectif ;
4. accomplir une mission complète ;
5. obtenir son premier Souvenir ;
6. débloquer sa Ville ;
7. voir immédiatement une vraie carte de ville ;
8. construire et retrouver sa construction après reconnexion ;
9. retourner dans le Monde ;
10. constater que sa progression Monde modifie la Ville ;
11. poursuivre les huit héritages jusqu'à la confrontation avec l'Oubli ;
12. continuer à jouer après l'histoire principale.

C'est ce parcours qui devient la référence de toutes les futures évolutions.