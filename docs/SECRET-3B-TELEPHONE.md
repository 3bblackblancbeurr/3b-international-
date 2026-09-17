# Téléphone Secret 3B — dossier de mise en service

## Objectif

Parcours final, exclusivement dans l'application 3B :

`Secret 3B → transmissions datées → énigmes → numéro reconstruit → appel → question 1/2 → 5 premiers gagnants → code gagnant à 8 chiffres → retour dans Secret 3B → réclamation du pull`

TikTok n'intervient dans aucune étape de ce dispositif.

## État actuel sécurisé

Le système doit rester **désarmé** jusqu'au lancement réel :

- campagne `telephone-secret-3b` créée ;
- limite préparée : 5 gagnants ;
- aucune transmission ni énigme réelle programmée tant que les dates/contenus ne sont pas validés ;
- concours téléphonique `enabled = false` ;
- aucune bonne réponse 1/2 configurée ;
- aucune fenêtre d'ouverture/fermeture configurée ;
- aucun gagnant réel ;
- aucun appel réel ;
- webhook téléphone refuse le service tant que `TWILIO_AUTH_TOKEN` et `SECRET3B_CONTEST_SECRET` ne sont pas configurés.

Ne jamais activer `enabled=true` avant la fin du pré-vol décrit ci-dessous.

## Informations à fournir avant lancement

Aucune de ces informations ne doit être inventée :

1. Date + heure Europe/Paris de chaque transmission.
2. Titre et texte de chaque énigme.
3. Chiffre(s) ou fragment(s) du numéro révélés par chaque énigme.
4. Nombre final de transmissions.
5. Numéro téléphonique réel une fois acquis chez l'opérateur.
6. Question finale entendue au téléphone.
7. Texte du choix 1.
8. Texte du choix 2.
9. Bonne réponse : touche 1 ou touche 2.
10. Date + heure d'ouverture du concours téléphonique.
11. Date + heure de fermeture si une fermeture calendaire est souhaitée.
12. Règle de taille du pull si une liste de tailles doit être imposée.

## Architecture

### Application

La page `Secret 3B` :

- lit la campagne publique ;
- affiche le calendrier des transmissions ;
- ne reçoit le contenu d'une énigme qu'après son heure serveur ;
- garde le brouillon du numéro uniquement sur l'appareil du joueur ;
- déverrouille l'appel quand toutes les transmissions sont effectivement libérées par le serveur ;
- affiche la zone de réclamation du pull après la dernière transmission.

### Base de données

Tables publiques en lecture contrôlée par RLS :

- `secret3b_campaigns`
- `secret3b_slots`
- `secret3b_clues`

Tables internes non accessibles directement aux visiteurs/utilisateurs :

- `secret3b_phone_contests`
- `secret3b_phone_attempts`
- `secret3b_phone_winners`
- `secret3b_claim_rate_limits`

Les RPC sensibles `secret3b_claim_phone_answer` et `secret3b_claim_phone_prize` sont exécutables uniquement par `service_role`.

### Téléphone

Edge Function : `secret3b-phone`

- vérifie la signature Twilio ;
- exige un numéro appelant non masqué ;
- demande une seule touche DTMF : 1 ou 2 ;
- garantit une seule participation par numéro haché ;
- attribue atomiquement les rangs gagnants 1 à 5 ;
- la 6e bonne réponse et les suivantes reçoivent le résultat `correct_too_late` ;
- un rejeu du même webhook ne crée pas un nouveau gagnant ;
- annonce au gagnant un code déterministe à 8 chiffres ;
- ne stocke jamais ce code en clair, uniquement son HMAC.

### Réclamation du pull

Edge Function : `secret3b-claim`

- exige une vraie session de compte 3B ;
- le code gagnant est associé à un seul compte ;
- un compte ne peut réclamer qu'un lot pour la campagne ;
- un code utilisé par un autre compte est refusé ;
- 8 essais invalides maximum par fenêtre de 15 minutes et par compte ;
- un rejeu légitime de la même réclamation est idempotent ;
- enregistre nom de livraison, taille, adresse, code postal, ville et pays après validation du code.

## Secrets techniques à configurer

### `SECRET3B_CONTEST_SECRET`

- secret aléatoire fort d'au moins 32 caractères ;
- valeur strictement identique dans `secret3b-phone` et `secret3b-claim` ;
- sert au HMAC de l'appelant et des codes gagnants ;
- ne jamais l'ajouter à GitHub, au frontend, aux logs ou à un `VITE_*` ;
- ne pas utiliser le token Twilio à sa place.

### `TWILIO_AUTH_TOKEN`

- uniquement dans `secret3b-phone` ;
- sert uniquement à authentifier les webhooks Twilio ;
- ne jamais l'exposer dans l'application.

## Configuration du numéro téléphonique

Une fois le numéro acheté et vérifié :

1. utiliser un numéro compatible Voice ;
2. ouvrir la configuration des appels entrants ;
3. méthode : `POST` ;
4. webhook : `https://ttvhcezucsbbmnafrotq.supabase.co/functions/v1/secret3b-phone` ;
5. ne pas rediriger vers un numéro personnel ;
6. vérifier qu'un appel entrant atteint bien le webhook et que la signature Twilio est acceptée.

Le numéro public ne doit être inscrit en clair dans aucune énigme : les joueurs doivent le reconstruire à partir des transmissions.

## Ordre de programmation des transmissions

Pour chaque énigme :

1. créer le `slot` avec son `sequence_no`, son `publish_at` et son label ;
2. créer le contenu dans `secret3b_clues` ;
3. garder `enabled=true` sur la clue uniquement si elle est prête ;
4. vérifier, avant sa date, que le calendrier est visible mais que le contenu de la clue ne l'est pas ;
5. vérifier après l'heure de test que le contenu devient lisible ;
6. remettre ensuite les vraies dates.

La sécurité de publication repose sur l'heure `now()` de PostgreSQL, pas sur l'horloge du téléphone du joueur.

## Pré-vol obligatoire avant activation

Le lancement réel n'est autorisé qu'après validation des points suivants :

- [ ] toutes les transmissions ont une date Europe/Paris correcte ;
- [ ] toutes les énigmes sont présentes et relues ;
- [ ] aucun futur contenu n'est récupérable par le rôle public ;
- [ ] le numéro final reconstruit est exactement le numéro acheté ;
- [ ] le bouton d'appel n'est disponible qu'après la dernière transmission ;
- [ ] `SECRET3B_CONTEST_SECRET` est présent dans les deux fonctions ;
- [ ] `TWILIO_AUTH_TOKEN` est présent dans la fonction téléphone ;
- [ ] la signature Twilio invalide retourne 403 ;
- [ ] un numéro masqué est refusé ;
- [ ] mauvaise touche / aucune touche est refusée ;
- [ ] mauvaise réponse ne gagne rien ;
- [ ] bonne réponse attribue le rang attendu ;
- [ ] cinq appels de test contrôlés peuvent simuler les rangs 1 à 5 ;
- [ ] un sixième appel correct est refusé comme trop tard ;
- [ ] même `CallSid` rejoué ne crée pas de deuxième gagnant ;
- [ ] même numéro sur un nouvel appel est reconnu comme déjà participant ;
- [ ] le code à 8 chiffres entendu permet une réclamation dans l'application ;
- [ ] même code/même compte rejoué reste idempotent ;
- [ ] même code/autre compte est refusé ;
- [ ] même compte/deuxième code est refusé ;
- [ ] 9e mauvais essai de code dans 15 min est bloqué ;
- [ ] aucune donnée de simulation ne reste en base ;
- [ ] `max_winners = 5` ;
- [ ] le concours est encore `enabled=false` à la fin du pré-vol.

## Activation finale

Ordre recommandé :

1. terminer et vérifier toutes les transmissions ;
2. configurer le vrai numéro et le webhook ;
3. configurer question, choix 1/2 et bonne touche ;
4. configurer `opens_at` et éventuellement `closes_at` ;
5. refaire un contrôle de lecture publique des énigmes futures ;
6. confirmer `max_winners=5` ;
7. garder la campagne `active` ;
8. passer le concours téléphonique à `enabled=true` seulement au moment choisi.

## Arrêt d'urgence

### Couper uniquement le concours téléphonique

Passer `secret3b_phone_contests.enabled` à `false`.

Effet : les énigmes peuvent rester visibles mais aucun nouvel appel ne peut participer.

### Masquer entièrement le Secret 3B

Passer `secret3b_campaigns.status` à `draft`.

Effet : campagne, calendrier et clues deviennent invisibles aux rôles publics, et le téléphone n'est plus considéré comme ouvert.

### Clôture normale

1. passer le concours téléphonique à `enabled=false` ;
2. passer la campagne à `closed` si l'on veut conserver les transmissions visibles comme archive ;
3. vérifier les 5 gagnants et les réclamations ;
4. expédier les lots ;
5. appliquer la politique de suppression des données de livraison après la durée nécessaire au traitement et aux obligations applicables.

## Règles de données

- Ne pas stocker le numéro appelant en clair dans la base de concours.
- Ne pas stocker le code gagnant en clair.
- Ne collecter l'adresse qu'après validation d'un vrai code gagnant et d'un compte 3B connecté.
- Ne jamais afficher les coordonnées des gagnants dans l'interface publique.
- Les données de livraison doivent être supprimées/anonymisées lorsqu'elles ne sont plus nécessaires, selon la politique de conservation validée avant lancement.

## Éléments volontairement non renseignés aujourd'hui

Le système est prêt, mais ces valeurs restent vides tant qu'elles ne sont pas fournies explicitement :

- dates des énigmes ;
- contenu réel des énigmes ;
- fragments du numéro ;
- vrai numéro de téléphone ;
- question téléphonique ;
- choix 1 et choix 2 ;
- bonne touche ;
- dates d'ouverture/fermeture du concours ;
- secrets Twilio/3B.

C'est volontaire : aucune information réelle de campagne ne doit être devinée ou préremplie.
