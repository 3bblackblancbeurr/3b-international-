# Modération 3B — V1

## Objectif

Protéger les salons, publications, profils communautaires et demandes privées sans transformer chaque gros mot en alerte propriétaire.

Le contrôle est exécuté côté serveur. Le frontend affiche seulement le résultat.

## Décisions

### 0 — propre
- accepté ;
- aucune trace de sanction.

### 1 — vulgarité légère
- message accepté ;
- terme masqué automatiquement ;
- avertissement discret au membre ;
- +1 au score de récidive ;
- pas d'alerte propriétaire.

### 2 — langage abusif non dirigé / contournement
- terme abusif normal : masquage ;
- contournement volontaire par espaces, chiffres ou symboles : blocage ;
- +2 au score ;
- pas d'alerte propriétaire sauf si une restriction est atteinte.

### 3 — insulte dirigée
- message refusé ;
- événement de modération enregistré ;
- +3 au score ;
- alerte propriétaire urgente.

### 4 — menace ou terme haineux grave
- message refusé ;
- événement enregistré ;
- +5 au score ;
- alerte propriétaire critique ;
- restriction temporaire forte.

## Récidive

Fenêtre de remise à zéro du score : 30 jours sans nouvelle violation.

- score < 5 : pas de restriction ;
- score >= 5 : 15 minutes ;
- score >= 8 : 24 heures ;
- score >= 12 : 7 jours ;
- gravité 4 : 7 jours directement.

Le propriétaire peut lever une restriction. Cette action est journalisée et le membre reçoit une notification.

## Contournements détectés

La normalisation de détection :
- retire les accents pour la comparaison ;
- convertit plusieurs substitutions courantes (`0 -> o`, `3 -> e`, `4 -> a`, etc.) ;
- neutralise les répétitions excessives ;
- compare aussi une forme compacte sans espaces / ponctuation.

Exemples testés :
- `c0nnard` ;
- `p u t a i n` ;
- répétitions de lettres.

La valeur originale n'est jamais transformée pour un message propre. Le masque n'est appliqué qu'à la copie réellement enregistrée quand la décision est `mask`.

## Données de modération

`community_moderation_events` conserve :
- utilisateur ;
- origine (`chat`, `post`, `profile`, `request`) ;
- identifiant du contenu si disponible ;
- décision ;
- gravité ;
- motifs ;
- extrait limité ;
- date ;
- résolution éventuelle.

`community_moderation_state` conserve :
- score ;
- date de dernière violation ;
- restriction en cours.

Ces tables sont privées et ne sont pas directement lisibles par les membres.

## Anti-faux-positifs

La détection directe se fait par tokens normalisés, pas par sous-chaîne libre.
La forme compacte sert principalement à identifier une tentative de contournement.

Les tests couvrent notamment des phrases ordinaires qui ne doivent pas être bloquées.

## Limites connues V1

Le dictionnaire déterministe V1 est volontairement conservateur et principalement français.
Il ne doit pas être élargi avec des listes massives non testées qui multiplieraient les faux positifs.

Évolutions possibles :
- packs linguistiques contrôlés pour les langues réellement utilisées ;
- seconde passe contextuelle uniquement pour les cas ambigus ;
- appel à un service de modération externe sous feature flag ;
- procédure d'appel / contestation d'une sanction ;
- détection spécialisée du spam de liens.

Toute évolution doit conserver le principe : une décision automatisée grave doit être observable et révisable par le propriétaire.
