# Monde du 3B — Canon narratif versionné

## Source de vérité unique

Le canon mondial officiel reste **`src/world/story-canon.js`**.

Il définit :
- Kaïs, Porteur du Lien ;
- le Cercle Brisé ;
- la nature de l'Oubli ;
- les huit Gardiens et les huit valeurs ;
- les arcs personnels des Gardiens ;
- la finale et les révélations.

`src/world/country-campaigns.js` est seulement un **catalogue de questions, styles et beats de campagne**. Il ne peut pas contredire ou remplacer `story-canon.js`, et il n'est pas injecté dans le reducer autoritaire `guardian-values.js`.

## Règle des huit

Il existe exactement huit pays, huit Gardiens, huit valeurs et huit fragments. Kaïs n'est jamais un neuvième Gardien ou une neuvième valeur.

## Autorité

Ces fichiers sont narratifs/data-driven. Ils ne peuvent pas :
- accorder XP, fragments ou inventaire ;
- valider une mission ;
- modifier le WorldState ;
- remplacer l'autorité Supabase/Unreal ;
- prétendre qu'un asset Unreal existe.

La cohérence est verrouillée par `tests/world-narrative-canon-v2.test.js`.

## Frontière gameplay

`guardian-values.js` reste inchangé et continue d'être mirrorré côté moteur serveur. Les métadonnées narratives ne modifient donc aucun reducer, calcul de progression ou état autoritaire.


## La Cité des Huit Héritages

La Cité est le lieu où les conséquences de l’histoire deviennent visibles. Elle n’est pas un menu entre deux royaumes.

Boucle canonique :
1. Kaïs et le joueur partent de la Cité ;
2. ils franchissent une Porte ;
3. ils aident les habitants à restaurer trois traces de mémoire ;
4. ils traversent une épreuve liée à la valeur du pays ;
5. ils affrontent puis libèrent le Gardien ;
6. le fragment / sceau rejoint la progression ;
7. le Gardien revient dans la Cité ;
8. le Hub change visiblement et de nouvelles relations, activités ou révélations deviennent possibles.

La Tour du Cercle Brisé matérialise la relation entre les huit héritages. Elle ne remplace jamais les dix quartiers ni les huit secteurs territoriaux.

La Cité est une zone sûre. Les tensions narratives s’y expriment par le dialogue, les choix, les souvenirs, les événements et l’Arène encadrée ; elles ne transforment pas le Hub en zone hostile.

## Progression du Cercle dans la Cité

Le nombre de pays restaurés pilote huit étapes visibles entre la Cité blessée et le Cercle retrouvé. Le retour des Gardiens fait émerger progressivement :
- de nouveaux signaux lumineux ;
- davantage de circulation et d’habitants ;
- des dialogues croisés entre Gardiens ;
- de nouvelles passerelles, activités et secrets ;
- une lecture de plus en plus claire de la véritable fonction de l’anneau de Kaïs.

Après le huitième retour, les huit fragments restent rattachés à leurs héritages. Kaïs utilise le connecteur qu’il porte pour permettre au Cercle de répondre à nouveau comme un ensemble sans transformer les huit valeurs en une valeur unique.
