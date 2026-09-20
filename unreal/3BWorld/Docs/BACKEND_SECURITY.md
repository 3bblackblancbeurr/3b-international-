# Sécurité backend 3B World

## Interdit dans le client Unreal
- SUPABASE_SERVICE_ROLE_KEY ;
- secret API key ;
- mot de passe base ;
- logique d'attribution de récompenses sensibles ;
- preuve fabriquée de possession d'une Ville.

## Autorisé
- URL publique Supabase ;
- clé publishable/anon prévue pour le client ;
- JWT de session utilisateur ;
- commandes vers les Edge Functions.

## Flux

Unreal → commande authentifiée → Edge Function → validation session / user_id → transaction / état → réponse.

Le Passeport, le Monde et Ville 3B doivent toujours être relus dans le contexte du compte connecté.

## Ville 3B
Le client demande une vérification. Le serveur contrôle la ville réelle et ses placements. Une ville existante ne doit jamais être reverrouillée par une nouvelle condition de progression.
