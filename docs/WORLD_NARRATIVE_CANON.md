# Monde du 3B — Canon narratif versionné

Source exécutable : `src/world/narrative-canon.js`.

Ce module fixe uniquement le **canon narratif partagé**. Il ne valide pas à lui seul qu'une mission, une cinématique ou un asset Unreal existe réellement.

## Piliers

- Mémoire
- Héritage
- Valeurs
- Reconstruction

## Règle des huit

Le Monde du 3B possède exactement huit Gardiens et huit valeurs :

- France — Céliane — Justice
- Algérie — Yliane — Loyauté
- Espagne — Diego — Passion
- Maroc — Naël — Noblesse
- Italie — Alessio — Espoir
- Tunisie — Soraya — Courage
- Turquie — Émir — Foi
- Estonie — Eira — Sagesse

Kaïs n'est ni un neuvième Gardien ni une neuvième valeur. Il est le fil narratif qui précède le joueur.

## Oubli

L'Oubli est défini comme un mécanisme de protection corrompu devenu incapable de distinguer ce qui doit être caché de ce qui doit être préservé. Le Monstre de l'Oubli en est une manifestation, pas une justification pour réduire la finale à un simple boss à points de vie.

## Utilisation

Les systèmes peuvent lire :
- la question centrale de chaque territoire ;
- le défaut et l'évolution du Gardien ;
- le style de mission ;
- les beats de campagne.

Ils ne doivent pas :
- créer une récompense client ;
- modifier la progression persistante ;
- remplacer les contrats serveur France/Unreal ;
- introduire une neuvième valeur.

La cohérence est verrouillée par `tests/world-narrative-canon-v2.test.js`.
