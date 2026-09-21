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
