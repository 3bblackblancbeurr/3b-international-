# 3B — revue SECURITY DEFINER production

## Méthode
Chaque fonction exposée est classée selon ses contrôles internes. Aucune révocation de masse : plusieurs fonctions SECURITY DEFINER sont volontairement les seules portes serveur vers des tables fail-closed.

## Catégories validées

### Directeur uniquement
- app_director_traffic
- app_director_traffic_summary
- app_director_traffic_timeline
- secret3b_director_schedule
- secret3b_director_set_event

Ces fonctions vérifient auth.uid() puis l'identité publique vérifiée `director_founder`.

### Membre / autorité serveur
- nexus_remove_building
- nexus_upgrade_building
- secret3b_start_daily_attempt
- secret3b_complete_daily_attempt

Elles lient l'action à auth.uid() et manipulent l'état serveur. Les RPC Nexus utilisent révision/idempotence et ownership de la ville.

### Monde coop renforcé
- world_party_command
- world_party_runtime_command

Contrôles présents : auth.uid(), session_id valide, rate-limit, taille payload, actions autorisées et ownership/membership.

## À revoir individuellement avant P0 final
### app_install_ping / app_presence_ping
Usage public intentionnel de télémétrie. Ils sont rate-limités et bornent les chaînes ; conserver public uniquement si la métrique anonyme reste nécessaire.

### secret3b_daily_status
Accessible anon et SECURITY DEFINER. Son rôle public est fonctionnel, mais il matérialise l'événement quotidien. Revoir si cette matérialisation doit rester accessible sans session ou passer par une Edge Function.

### threeb_rarity_supply_status
Lecture agrégée, mais SECURITY DEFINER sans ownership. Revoir si l'agrégat doit rester disponible à tout membre ou être servi par une API dédiée.

## Règle future
Toute nouvelle fonction SECURITY DEFINER doit avoir :
1. search_path fixe ;
2. grants explicitement révoqués puis réaccordés ;
3. auth.uid() ou une justification écrite du mode public ;
4. ownership/role check ;
5. validation de payload ;
6. idempotence pour toute mutation économique ;
7. rate-limit si exposée directement ;
8. test de sécurité dans Fortress.
