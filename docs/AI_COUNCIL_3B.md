# Conseil IA 3B — architecture v1

## État actuel

Le socle est volontairement séparé en deux plans:

- **contrôle**: ChatGPT / orchestrateur, approbation et journalisation;
- **exécution**: OpenAI, Anthropic Claude et Google Gemini comme analyses indépendantes.

Supabase conserve les tâches, exécutions, revues, décisions et événements. Les tables sont **service-only**: RLS est activé, les rôles `anon` et `authenticated` n'ont aucun droit direct, et les clés fournisseurs ne sont jamais stockées en base.

L'Edge Function `ai-council-orchestrate` est fail-closed. Elle exige:

- un JWT Supabase valide;
- `AI_COUNCIL_ENABLED=true`;
- `AI_COUNCIL_OWNER_USER_ID` égal au compte autorisé;
- un fournisseur activé dans `ai_council_provider_registry`;
- une clé API et un modèle configurés côté serveur.

Tant que ces conditions ne sont pas réunies, aucun appel fournisseur n'est envoyé.

## Secrets serveur

Configurer uniquement dans les secrets Supabase Edge Functions, jamais dans le frontend, GitHub, les variables `VITE_*` ou Unreal:

- `AI_COUNCIL_ENABLED`
- `AI_COUNCIL_OWNER_USER_ID`
- `OPENAI_API_KEY`
- `AI_COUNCIL_OPENAI_MODEL`
- `ANTHROPIC_API_KEY`
- `AI_COUNCIL_ANTHROPIC_MODEL`
- `GEMINI_API_KEY`
- `AI_COUNCIL_GEMINI_MODEL`

Les noms de modèles sont des variables d'environnement afin d'éviter de figer des modèles qui pourront être remplacés ou retirés.

## Flux

1. Une tâche est créée avec un objectif et un contexte.
2. Les fournisseurs activés répondent indépendamment.
3. Chaque réponse est persistée dans `ai_council_runs`.
4. Le quorum est vérifié.
5. Une décision `draft` est créée.
6. **Aucune mutation GitHub, Supabase de gameplay ou Unreal n'est déclenchée par une réponse d'IA.**
7. Une couche de validation peut ensuite synthétiser, tester et approuver explicitement le changement.

## Principe de sécurité

Les modèles sont des conseillers, pas des autorités. Les sorties des modèles sont des données non fiables jusqu'à validation. Les changements de code passent par une branche et une Pull Request. Les commandes Unreal doivent être limitées à une liste d'actions autorisées.

## Tables

- `ai_council_provider_registry`
- `ai_council_tasks`
- `ai_council_runs`
- `ai_council_reviews`
- `ai_council_decisions`
- `ai_council_events`
