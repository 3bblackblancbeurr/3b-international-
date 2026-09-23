# Centre propriétaire & notifications 3B — V1

## Principe

3B International utilise un seul pipeline transversal :

```
événement métier / sécurité / technique
  -> classification
  -> déduplication / seuil anti-bruit
  -> boîte propriétaire OU notification membre
  -> lu / en cours / terminé / archivé
  -> journal d'action propriétaire
```

Les modules ne doivent pas créer leur propre boîte de réception.

## Deux surfaces

### Notifications membre

Route : `#notifications`

Contient :
- informations liées au compte ;
- sport et validation de défis ;
- boutique ;
- marketplace / échanges ;
- récompenses ;
- modération concernant le membre ;
- réponses privées de 3B ;
- demandes envoyées à 3B.

Un membre ne peut lire que ses propres notifications et demandes. Le client n'a aucun droit d'insertion direct.

### Centre propriétaire

Route privée : `#centre-3b`

Le bouton n'est exposé que lorsque l'API confirme que le compte connecté correspond au `owner_user_id` de `control_center_settings`.
Une saisie manuelle de la route ne donne aucun droit : les opérations propriétaire sont à nouveau contrôlées côté serveur.

États :
- `new` : à traiter ;
- `in_progress` : pris en charge ;
- `done` : terminé ;
- `archived` : archivé.

Priorités :
- `info` : historique utile, pas de badge propriétaire ;
- `important` : demande une attention normale ;
- `urgent` : traitement prioritaire ;
- `critical` : sécurité / modération grave.

Le badge propriétaire ignore les événements `info` afin qu'une hausse des inscriptions ne masque pas les vraies alertes.

## Événements reliés en V1

| Domaine | Événement | Destinataire | Anti-bruit |
| --- | --- | --- | --- |
| Compte | nouvelle inscription | propriétaire / info | pas dans le badge |
| Compte | suppression | propriétaire | dédupliqué par compte |
| Auth | échecs répétés | propriétaire | seuils 5 / 10 / 20 sur 15 min |
| Communauté | défi / collaboration | propriétaire | 1 événement par publication |
| Communauté | vote | membre | 1 notification par publication et par jour |
| Communauté | suivi | membre | 1 notification par relation |
| Communauté | signalement | propriétaire | 1 événement par signalement |
| Communauté | blocages répétés | propriétaire | seuils 3 / 5 / 10 |
| Modération | insulte / menace grave | propriétaire | seulement gravité >= 3 ou restriction |
| Modération | contenu masqué | membre | 1 notification par contenu |
| Sport | preuve soumise | propriétaire | 1 événement par soumission |
| Sport | validation / rejet | membre | état du défi |
| Boutique | commande payée | propriétaire + membre | session Stripe |
| Boutique | changement fulfillment | propriétaire + membre | statut |
| Boutique | échec notification | propriétaire | session + canal + événement |
| Secret 3B | gagnant / lot réclamé | propriétaire (+ membre si identifié) | tentative |
| Marketplace | offre / changement d'état | membre | offre + statut |
| Économie | profil de risque à revoir | propriétaire | palier de risque / jour |
| Récompenses | rejet / trop de tentatives | propriétaire (+ membre si rejet) | ligne outbox |
| Application | crash React | propriétaire | empreinte + tranche horaire |
| Monde | échec synchro serveur | propriétaire | empreinte + tranche horaire |
| Ville | erreur serveur | propriétaire | empreinte + tranche horaire |
| Arène | erreur serveur | propriétaire | empreinte + tranche horaire |
| IA / ecosystem | erreur 5xx | propriétaire | empreinte + tranche horaire |
| Demande privée | message à 3B | propriétaire + accusé membre | demande |

## Sécurité

- RLS activée sur toutes les nouvelles tables publiques.
- Les tables propriétaire n'accordent aucun accès direct à `authenticated`.
- `member_notifications` : lecture de son propre compte seulement ; le seul UPDATE direct autorisé est `read_at`.
- `threeb_requests` : lecture de ses propres demandes seulement ; création/réponse via Edge Function.
- rôle propriétaire vérifié côté serveur à partir de `control_center_settings.owner_user_id`.
- session Supabase vérifiée via `loyalty_session_valid`.
- service key uniquement dans les Edge Functions.
- journal `owner_action_log` pour les décisions du propriétaire.
- les incidents client n'envoient ni mot de passe, ni token, ni stockage local.

## Modération

Voir `docs/MODERATION_3B_V1.md`.

## Ordre de déploiement obligatoire

1. Depuis un environnement Supabase CLI authentifié, créer une vraie migration :
   `supabase migration new owner_notification_center_v1`.
2. Copier le contenu de `supabase/owner-notification-center-v1.sql` dans la migration générée.
3. Tester la migration sur un environnement non-production puis appliquer la migration.
4. Vérifier que le `owner_user_id` est présent et qu'il est synchronisé dans `community_staff`.
5. Déployer `notification-center` avec vérification JWT activée.
6. Déployer `ecosystem-private` avec le module partagé de modération.
7. Déployer le frontend.
8. Smoke tests membre + propriétaire.
9. Seulement après validation : fusion vers la branche de publication.

Le fichier SQL de préparation a été compilé contre la base actuelle dans une transaction avec `ROLLBACK` ; il n'a pas été appliqué en production pendant la préparation.

## Smoke tests de publication

### Membre
- créer / connecter un compte ;
- ouvrir la cloche ;
- envoyer une demande privée ;
- la retrouver dans « Mes demandes » ;
- publier un message propre ;
- publier un gros mot léger -> terme masqué + information ;
- publier une insulte dirigée -> refus ;
- vérifier qu'un membre ne peut jamais ouvrir les données propriétaire via l'API.

### Propriétaire
- vérifier que « Centre propriétaire 3B » apparaît uniquement sur le bon compte ;
- voir la demande privée ;
- répondre -> notification membre ;
- passer un élément À traiter -> En cours -> Terminé -> Archivé ;
- traiter un signalement ;
- voir une restriction active et la lever ;
- valider un défi sport ;
- vérifier le journal d'action ;
- vérifier que les inscriptions `info` ne gonflent pas le badge.

### Résilience
- couper le réseau : aucune fausse alerte technique ;
- provoquer une réponse serveur 5xx de test : un incident, pas une rafale ;
- répéter le même incident : déduplication horaire ;
- reconnecter : le Monde conserve puis resynchronise la copie locale.

## À ne pas mélanger

Le **Centre de commande 3B** (pilotage PC / Unreal) reste distinct du **Centre propriétaire 3B** (administration de l'application).
Ils peuvent apparaître dans le même groupe « Administration privée », mais n'ont pas les mêmes responsabilités.

## Extensions futures

Après stabilisation V1 :
- push natif Android/iOS ;
- e-mail pour événements choisis ;
- préférences de notification par membre ;
- rôles délégués (support, modération, boutique) avec permissions minimales ;
- regroupement automatique de séries d'événements ;
- métriques / SLA d'incidents ;
- rétention programmée des historiques anciens.

Ces canaux externes resteront des moyens de livraison. Supabase demeure la source de vérité.
