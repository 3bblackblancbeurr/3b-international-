# Jev + GPT dans 3B International

## Objectif

Jev sert de couche de décision rapide et structurée. GPT et les autres modèles génératifs restent responsables des réponses textuelles.

Flux principal :

`utilisateur -> fonction Supabase ecosystem -> Jev (décision) -> GPT (réponse) -> utilisateur`

Jev ne remplace pas GPT et ne génère pas le texte final.

## Activation

Les clés restent uniquement dans les secrets Supabase Edge Functions. Ne jamais les mettre dans le frontend, dans une variable `VITE_*`, dans GitHub ou dans un message public.

Secrets utilisés :

- `AI_ENABLED=true`
- `JEV_ENABLED=true`
- `TYPESAFE_API_KEY=<clé TypeSafe>`
- `TYPESAFE_MODEL=jev-latest`
- `OPENAI_API_KEY=<clé OpenAI>`
- `OPENAI_CHAT_MODEL=gpt-5.6`

Le code reste compatible quand Jev est absent : la communauté et l'assistant continuent avec le comportement existant.

## Communauté

Avant un message de salon ou une publication, le serveur demande à Jev une décision parmi :

- `allow` : publication normale ;
- `warn` : vulgarité légère, demander une reformulation ;
- `block` : insulte dirigée / harcèlement, contenu non visible ;
- `escalate` : menace, haine ou harcèlement grave, contenu non visible + signalement dans la file de modération.

Les décisions sévères exigent un seuil de confiance. Une réponse Jev invalide ou une indisponibilité ne fait pas tomber la communauté.

## Assistant 3B

Pour `chat-ai`, Jev prépare un plan borné :

- domaine : `general | creative | technical | threeb`
- profondeur : `concise | standard | deep`

Ce plan est ajouté comme signal interne au message système du modèle génératif. Le texte de l'utilisateur ne peut pas définir directement ces valeurs.

## Monde du 3B

Le même client Jev pourra être réutilisé pour les réactions de PNJ (attitude, confiance, prix, quête, dette, promesse), sans lui confier la génération des dialogues. La mémoire longue durée des PNJ reste une couche séparée et persistante.

## ALBERT

Ne pas placer Jev dans le cœur local obligatoire d'ALBERT : l'API TypeSafe est distante. Un connecteur Jev pourra être optionnel, désactivé par défaut, afin de préserver le fonctionnement local-first.
