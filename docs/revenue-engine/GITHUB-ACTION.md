# PWA QuickKit — GitHub Action

Cette action permet d'ajouter un contrôle PWA simple à une Pull Request ou à un workflow manuel.

## Exemple

```yaml
name: PWA quality gate

on:
  pull_request:
  workflow_dispatch:

jobs:
  pwa:
    runs-on: ubuntu-latest
    steps:
      - uses: 3bblackblancbeurr/3b-international-/.github/actions/pwa-quickkit@main
        id: audit
        with:
          url: https://example.com

      - run: echo "Score ${{ steps.audit.outputs.score }} / Grade ${{ steps.audit.outputs.grade }}"
```

## Sorties

- `score` : score de 0 à 100.
- `grade` : note A à E.

L'action écrit également un résumé dans GitHub Actions avec les corrections prioritaires.

## Comportement

- URL publique HTTP(S) uniquement.
- Refus des adresses privées/locales.
- Taille de réponse et redirections limitées.
- L'action échoue si le score est inférieur à 60, afin de pouvoir servir de quality gate.
- L'audit reste statique : un Service Worker enregistré uniquement depuis un bundle externe peut nécessiter une vérification navigateur supplémentaire.

## Audit web

Pour un diagnostic interactif :
https://3b-international.vercel.app/pwa-quickkit/
