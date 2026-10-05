# DESTIN — raccordement au Passeport existant

État vérifié le 5 octobre 2026. Ce document distingue les protections réellement installées de l’activation d’un prestataire d’identité.

## Appliqué sur la base 3B

Migrations enregistrées par Supabase :
- 20261005102702_destin_shared_passport_identity_bridge_v1
- 20261005102754_destin_identity_minimal_auth_reader_v1
- 20261005103242_destin_single_path_private_snapshot_v1

Le contrôle partagé réutilise `auth.users`, `member_profiles` et `passport_identity_verification_attempts`. Les opérations `start`, `resume`, `checkpoint`, `choose`, `finish`, `claim` et `vote` de `destin_command_server` exigent un e-mail confirmé, un compte non anonyme/non suspendu, un Passeport actif, une preuve IDnow vérifiée correspondant au profil, et une liaison de personne valide. Le catalogue, l’historique personnel et le Studio propriétaire restent distincts. Le propriétaire n’a pas d’exception pour jouer sous une deuxième identité.

Le registre `threeb_identity_private.verified_subjects` reste privé : RLS, absence volontaire de politique client, fonctions réservées au service serveur. Aucun document, numéro de CNI, selfie, portrait ou nom civil n’y est stocké. La lecture de l’état Auth est limitée à deux booléens par une fonction privée ; aucun droit général de lecture de `auth.users` n’a été accordé au service.

Une contrainte unique lie un sujet pseudonyme du prestataire à un compte, avec contrôle d’expiration et de révocation. Elle ne peut être alimentée qu’après une preuve d’identité vérifiée. Un hash de session est expressément refusé comme identifiant de personne. Un conflit demande un examen/récupération de compte, jamais une fusion automatique. Une liaison existante ne peut pas être substituée silencieusement.

Les parcours sont uniques par compte et histoire, y compris après publication d’une nouvelle version. Le redémarrage retrouve le parcours existant, même terminé. Une ancienne question ne permet pas de changer de réponse. Le snapshot serveur ne contient que la scène courante ; les autres vidéos ne sont pas remises au lecteur. Le compte à rebours automatique est désactivé dans les snapshots de lecture réelle.

## Code ajouté à la PR 463, pas encore déployé comme nouvelle Edge Function

`src/destin/passportIdentity.js` fournit un statut limité, sans identité civile ni identifiant de sujet. `handler.ts` utilise ce statut, guide vers le Passeport, refuse un ancien serveur qui remettrait l’arbre complet, et prépare une validation de publication exigeant un fichier vidéo privé distinct par scène. Il refuse les conditions exigeant de découvrir une autre fin de la même histoire. Les liens de lecture préparés dans cette version durent 15 minutes, ceux de prévisualisation propriétaire 2 heures. Un lien signé reste partageable jusqu’à expiration ; ce n’est pas un DRM ni une diffusion liée à la session à chaque segment.

## Tests réellement effectués

- 12 tests Node de l’adaptateur : preuves incomplètes, valeurs trompeuses, différence identité/unicité, absence de fuite de champs privés, liste des actions protégées, paramètres RPC et refus en cas d’erreur de base. Tous réussis localement.
- Sous le rôle SQL `service_role` : 19 profils contrôlés, aucun autorisé sans preuve ; les 7 actions protégées sont refusées même avec `p_owner=true`. Catalogue et historique répondent.
- Scénario SQL transactionnel avec deux comptes entièrement fictifs `@example.invalid` : identité sans sujet unique refusée ; référence de session refusée comme personne ; preuve synthétique complète acceptée ; même sujet sur un second compte refusé ; liaison révoquée/expirée et Passeport suspendu refusés ; parcours unique à travers redémarrages et versions ; seule scène courante retournée ; changement d’une décision refusé ; fin conservée.
- La transaction des fixtures a été annulée. Vérification finale : 19 profils, 0 profil civilement vérifié, 0 tentative d’identité, 0 liaison de personne, 0 film, 0 parcours, 0 compte de test restant. Aucune récompense réelle n’a été créée.
- Les rôles `anon` et `authenticated` ne peuvent ni exécuter le contrôle interne ni créer une liaison. `service_role` n’a toujours pas SELECT sur `auth.users`.

Ces tests ne sont PAS un test IDnow réel, ni un test simultané sur deux appareils, ni une validation du parcours navigateur après changement. Les nouveaux tests sont ajoutés au workflow sans supprimer les contrôles antérieurs.

## Conditions restantes avant ouverture réelle

1. Valider l’activation effective du prestataire IDnow et le parcours documentaire/titulaire retenu, sa base juridique, sa proportionnalité, le traitement des mineurs, les durées et obligations contractuelles. Aucune collecte nouvelle ni transmission de pièce n’a été activée ici.
2. Obtenir une attestation d’unicité et un identifiant stable de personne réellement garantis par le prestataire. Implémenter son adaptation côté serveur avec une pseudonymisation appropriée. Ne pas fabriquer cet identifiant à partir d’un numéro de session, d’une photo publique ou d’une combinaison nom/date de naissance. Aucun webhook existant n’a été supposé fournir cette donnée : le registre est vide et le contrôle reste fermé.
3. Déployer le nouveau handler avec ses dépendances, aligner les boutons de l’interface (retirer le rejeu réel, afficher le statut Passeport, confirmation de choix), vérifier les importations authentifiées et tests réels avant fusion/déploiement frontend. La PR n’a pas été fusionnée par cette intervention.
4. Réconcilier l’ensemble des migrations de fondation DESTIN et leur manifeste de dépôt avant de considérer la reconstruction depuis une base vierge comme vérifiée.

L’effacement du compte entraîne l’effacement de sa liaison ; aucune conservation indéfinie anti-réinscription n’a été instaurée. La prévention des réinscriptions après effacement exige une politique distincte justifiée. Le prêt de compte, l’enregistrement d’écran et le partage des vidéos ne sont pas rendus impossibles par ce raccordement.

## Avis sécurité après migration

Le nouvel avis INFO « RLS enabled, no policy » du registre privé est intentionnel : aucun accès client ne doit être ajouté pour faire disparaître cet avis. Les avertissements existants sur d’autres fonctions SECURITY DEFINER et la protection contre les mots de passe compromis désactivée subsistent ; ce travail ne constitue pas un audit complet ou une certification de la plateforme.
