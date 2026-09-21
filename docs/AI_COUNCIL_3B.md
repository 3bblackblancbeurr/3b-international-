# Conseil IA 3B

Le Conseil IA centralise des analyses indépendantes d'OpenAI, Anthropic Claude et Google Gemini sans donner à un modèle l'autorité directe de modifier GitHub, Supabase ou Unreal.

## Sécurité

- tables Conseil IA: service-only, RLS actif, pas d'accès direct anon/authenticated;
- fournisseur désactivé par défaut;
- clés API uniquement dans les secrets serveur Supabase;
- propriétaire vérifié côté serveur;
- toutes les décisions restent en brouillon avec approbation requise;
- aucune sortie de modèle n'est exécutée directement.

Le propriétaire peut être défini par un identifiant Supabase via `AI_COUNCIL_OWNER_USER_ID` ou, à défaut, par le réglage privé `ai_council_settings.owner_email`. L'adresse réelle n'est jamais versionnée dans ce dépôt public.

## Activation

L'orchestrateur reste fermé tant que `AI_COUNCIL_ENABLED=true` ou le réglage privé `ai_council_settings.enabled=true` n'est pas activé.

Chaque fournisseur exige aussi sa clé et son modèle:

- `OPENAI_API_KEY` + `AI_COUNCIL_OPENAI_MODEL`
- `ANTHROPIC_API_KEY` + `AI_COUNCIL_ANTHROPIC_MODEL`
- `GEMINI_API_KEY` + `AI_COUNCIL_GEMINI_MODEL`

Les noms de modèles restent configurables afin de ne pas figer un modèle susceptible d'être remplacé.
