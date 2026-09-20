# 3B Economy — XP global, Coins, Ville 3B et 3BC

## Version
- economy_version: `2026.2`
- xp_curve_version: `global-150-v2`
- niveau global: 1 → 150
- seuil niveau 150: `450 992 XP`

## Autorité

Le serveur est la seule source de vérité pour :
- XP global ;
- Coins ;
- niveau global ;
- récompenses ;
- ledger ;
- Ville 3B ;
- éventuel 3BC.

Le client peut demander une action, jamais un montant.

## Trois progressions distinctes

### XP global
Compte 3B complet. Sert au niveau 1–150.

### XP Monde
Progression narrative locale du Monde 3B. Elle peut déclencher des événements globaux validés par le serveur, mais n'est pas le même solde.

### XP Ville
Progression spécifique de Ville 3B.

Aucune des trois ne doit être remplacée silencieusement par une autre.

## Courbe globale

Le serveur stocke la table `threeb_level_curve`.

Repères v2 :
- niveau 1 : 0 XP
- niveau 2 : 50 XP
- niveau 5 : 623 XP
- niveau 10 : 2 727 XP
- niveau 30 : 22 937 XP
- niveau 60 : 83 545 XP
- niveau 100 : 214 302 XP
- niveau 130 : 346 931 XP
- niveau 150 : 450 992 XP

La courbe est versionnée. On ne change jamais les seuils historiques sans changer de version.

## Coins

Les Coins sont une monnaie interne au jeu :
- construction ;
- upgrade ;
- objets ;
- services ;
- personnalisation.

Ils ne sont pas une cryptomonnaie et ne sont pas librement convertibles en argent réel.

## Récompenses

Le moteur central est `threeb_credit_reward_server`.

Chaque récompense utilise :
- reward_code ;
- event_id ;
- idempotence ;
- cooldown éventuel ;
- limite journalière ;
- diminishing returns éventuels ;
- ledger ;
- economy_transactions ;
- economy_version.

Un événement identique ne doit jamais créditer deux fois.

## Monde → économie globale

Le Monde ne crédite pas directement des montants.

Il transforme uniquement certaines transitions serveur validées en intentions :
- première entrée pays → `country_entry`
- mission Hub majeure → `mission_main`
- mission Hub normale/mineure → `mission_side`
- événement Hub → `city_event`
- secret → `world_secret`
- Souvenir → `world_memory`
- découverte de zone → `world_zone`
- Gardien vaincu → `guardian`
- finale → `world_final`

Ces intentions passent par `threeb_reward_outbox`.

## Transactional outbox

`world_commit_v2` enregistre dans la même transaction :
1. la sauvegarde du Monde ;
2. la séquence appareil ;
3. les intentions de récompense.

Ensuite `threeb_process_reward_outbox_server` traite les crédits.

Ainsi :
- pas de récompense perdue si le crédit est momentanément indisponible ;
- pas de récompense accordée pour une sauvegarde refusée ;
- replay idempotent ;
- reprise possible.

## Ville 3B

La Ville possède une progression **séparée** du niveau global :

- `city_xp` : progression propre à la Ville ;
- `city_level` : niveau Ville 1 → 50 ;
- `land_tier` : taille/capacité du terrain, dérivée du niveau Ville.

Le niveau global 1–150 reste calculé par `threeb_level_from_xp()`, mais il ne doit plus remplacer le niveau Ville.

Le runtime actif de construction utilise `nexus_city_place_v2` :
- prérequis basés sur `city_level` ;
- quartier du pays requis lorsqu’un bâtiment est régional ;
- collisions et limites de terrain vérifiées côté serveur ;
- coût Coins débité côté serveur ;
- idempotence par `request_id` ;
- recalcul Ville par `nexus_city_recalculate()`.

Les upgrades utilisent eux aussi le niveau Ville.

L'ancien RPC `nexus_purchase_and_place_building`, qui utilisait encore le niveau global, est déprécié et n'est plus le chemin de construction actif.

Les quartiers autres que le pays d'origine sont reliés au Monde : ils exigent la libération du Gardien correspondant.

Achats, upgrades et remboursements doivent écrire :
- wallet ledger ;
- economy_transactions ;
- journal Ville.

## Fidélité / jeux

`loyalty_grant` alimente le même XP global via `threeb_wallet_apply_server`.

Le frontend ne doit jamais promettre un taux fixe comme “20 XP/minute”.
Les gains sont calculés et plafonnés côté serveur.

## 3BC

Règle absolue :
**XP ≠ Coins ≠ 3BC**

Aucune conversion automatique XP → 3BC.

État obligatoire actuel :
- token_enabled = false
- token_blockchain_enabled = false
- token_trading_enabled = false

Le ledger SQL 3BC est en quarantaine fail-closed :
- pas d'accès direct client ;
- trigger `threeb_token_ledger_fail_closed` ;
- toute écriture est refusée tant que token + blockchain ne sont pas explicitement activés.

Aucun mint réel n'existe dans cette architecture.

## Étape autorisée avant toute valeur réelle

La prochaine étape crypto éventuelle est uniquement un **testnet zéro valeur** :
- aucune monnaie réelle ;
- aucune seed ou clé privée dans GitHub ;
- aucune treasury réelle ;
- aucun mainnet ;
- aucun mécanisme permettant d'acheter, vendre ou convertir une valeur.

Le testnet ne doit être ouvert qu'après les audits applicatifs, base de données, permissions, idempotence, concurrence et replay.

## Avant activation réelle 3BC

Obligatoire :
- modèle de supply ;
- conformité juridique/fiscale ;
- règles KYC/AML si nécessaires ;
- smart contract testnet ;
- audit externe ;
- multisig treasury ;
- pause d'urgence ;
- monitoring ;
- plan incident ;
- tests double-mint/double-spend ;
- politique de récupération.

## Principe

Le Monde 3B doit rester entièrement jouable si 3BC n'est jamais activé.

Priorité :
**FIABILITÉ > SÉCURITÉ > JOUABILITÉ > PERFORMANCE > RARETÉ > MONÉTISATION**
