# API runtime Unreal — séquence minimale

## 1. Bootstrap

`POST /functions/v1/world-bootstrap`

Corps :
```json
{}
```

Headers client :
- `apikey: <publishable key>`
- `Authorization: Bearer <user JWT>`
- `Content-Type: application/json`

Le client ne transmet aucun `user_id` à faire confiance. Le serveur dérive l'utilisateur de la session.

## 2. Monde

`POST /functions/v1/world-engine`

```json
{
  "device": "<uuid>",
  "commands": [
    {"seq": 1, "action": {"type": "hubNpcTalk", "id": "ines_varga"}}
  ]
}
```

Les séquences restent ordonnées et validées par le serveur.

## 3. Ville 3B snapshot

`POST /functions/v1/city-3b`

```json
{"action":"snapshot"}
```

## 4. Création Ville 3B

Le pays envoyé par l'UI n'est pas une preuve d'identité. Le backend existant recoupe le profil/Passeport.

## 5. Synchronisation

```json
{"action":"sync_world"}
```

Le serveur écrit le reçu durable de synchronisation.

## Interdit

- `service_role` dans Unreal ;
- user_id choisi librement dans une requête ;
- reward/XP/Coins choisis par le client ;
- preuve de ville créée côté client.
