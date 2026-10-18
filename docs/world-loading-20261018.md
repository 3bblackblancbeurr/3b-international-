# Chargement du Monde 3B · 18 octobre 2026

## Correction livrée

`App.jsx` charge déjà `WorldEntry.jsx` avec `React.lazy`. Cette entrée ne choisit
plus entre plusieurs moteurs : elle transmet seulement `goTo` au monde officiel.
Son second `React.lazy`, vers `WorldPage.jsx`, imposait donc une requête séquentielle
supplémentaire avant de commencer le téléchargement du moteur et de ses dépendances.

`WorldEntry.jsx` importe maintenant le monde directement. L'unique frontière
asynchrone reste dans `App.jsx`, avec son écran de chargement existant. Le moteur
Three.js et le monde restent exclus du téléchargement initial de l'application.

## Mesure du build de production

Comparaison sur les mêmes sources de travail, en remplaçant uniquement la frontière
de chargement par son ancienne version pour le relevé « avant ». Les octets gzip
sont additionnés fichier par fichier avec `node:zlib`, sans prétendre mesurer un
temps de téléchargement réel.

| Mesure JavaScript | Avant | Après |
| --- | ---: | ---: |
| Frontières asynchrones successives avant le monde | 2 | 1 |
| Fichiers supplémentaires pour entrer dans le monde | 17 | 16 |
| Téléchargement supplémentaire du monde, brut | 2 431 192 octets | 2 429 759 octets |
| Téléchargement supplémentaire du monde, gzip | 761 150 octets | 761 115 octets |
| Application initiale, gzip | 291 627 octets | 291 728 octets |
| Tous les fichiers JavaScript, gzip | 1 834 670 octets | 1 834 737 octets |

Le gain est la suppression d'une requête bloquante et le démarrage plus tôt des
requêtes du monde. Les octets totaux compressés sont pratiquement identiques
(+67 octets sur tous les fichiers). Cette correction ne prétend ni réduire la
mémoire GPU, ni améliorer les FPS, ni supprimer le poids du moteur.

Le monde reste volumineux : son fichier de route représente environ 966 ko bruts
et 349 ko gzip au relevé. L'avertissement Vite sur les gros fichiers est conservé.
Three.js est déjà partagé automatiquement en fichiers moteur/rendu, et plusieurs
addons sont déjà partagés. Aucun regroupement global `vendor-three` n'a été ajouté,
car il aurait pu entraîner des téléchargements inutiles pour les autres scènes.

## Vérification reproductible

```sh
node scripts/verify-world-loading.mjs
npm run build
```

Le premier contrôle analyse le résultat final du build Vite en mémoire. Il vérifie
qu'une seule importation asynchrone ouvre le monde, que le monde et Three.js restent
hors des imports initiaux de l'application, et qu'aucun cycle statique n'existe
entre les fichiers générés. Il affiche les tailles réelles brutes et gzip. L'option
`--report chemin.json` permet d'enregistrer ce relevé. Les tailles évoluent avec le
contenu ; le contrôle vérifie les propriétés de chargement, sans seuil arbitraire.

Ces contrôles ne remplacent pas une mesure réseau et thermique sur téléphone réel.
