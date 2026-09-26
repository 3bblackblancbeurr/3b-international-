# 3B International — Architecture maître et source de vérité

**Référence : 26 septembre 2026**

Ce document est la carte de pilotage du dépôt. Il doit être mis à jour lorsqu'une brique change d'état, qu'une migration est appliquée, qu'une PR est fusionnée ou qu'un critère de release évolue.

## 1. Règles de gouvernance

1. `main` reste publiable. Un chantier structurel passe par une branche et une PR vérifiée.
2. Supabase production, le dépôt et `APPLIED_MIGRATIONS_SHA256.json` doivent rester strictement synchronisés.
3. Le **Passeport 3B** est la racine d'identité de l'écosystème. Aucun module ne crée un second compte ou un second identifiant d'autorisation.
4. `auth.users.id` est un identifiant interne. Il ne doit jamais devenir un numéro de Passeport, un QR public, un identifiant marketing ou une donnée partenaire.
5. Les badges, titres publics, pays, XP ou attributs de profil ne sont jamais des autorisations.
6. Les opérations sensibles restent côté serveur. Le cache local/offline sert à l'affichage et à la reprise, jamais à accorder un droit.
7. Un module n'est « fini » que lorsque ses tests, sa sécurité, son mobile réel et son chemin de récupération ont été validés.

## 2. Schéma directeur

```text
Supabase Auth
    |
    v
member_profiles
    |
    +--> PASSEPORT 3B V2 (identité racine)
    |       |
    |       +--> profil / origine
    |       +--> scopes de consentement
    |       +--> vérification temporaire
    |       +--> futurs partenaires
    |
    +--> économie / XP / fidélité / wallet
    +--> inventaire / collectibles
    +--> Monde 3B / Nexus / 8 royaumes
    +--> 3B MA VILLE
    +--> Jeux 3B
    +--> Nosbloc du 3B
    +--> Boutique
    +--> Communauté
    +--> Sport
```

Le fichier machine `config/passport-ecosystem-v2.json` et `src/passport/contract.js` portent les scopes de cette architecture.

## 3. Environnements

| Environnement | Usage | Règle |
|---|---|---|
| GitHub `main` | source publiable | pas de gros chantier directement |
| Vercel production | application web/PWA | déployer seulement après contrôles |
| Supabase `3b discuter` | backend principal | migrations immuables et auditées |
| Supabase `3B Nosbloc Staging` | Nosbloc privé | ne pas mélanger avec la prod |
| Android/iOS Capacitor | validation native | vraie validation appareil requise |
| Unreal/Blender | final-art Monde 3B | pipeline séparé, contrats serveur inchangés |

## 4. État réel au 26/09/2026

### Fondation déjà fusionnée sur main
- PR #296 : Hub V06, Nexus physique et verticalité.
- PR #297 : France Gold Master candidat, retour Hub et évolution huit royaumes.
- PR #298 : préparation final-art France, assets Blender et import Unreal.
- PR #299 : Nosbloc V1, 3B MA VILLE et éditeur mobile privé.
- PR #301 : Power 3B.
- Les derniers workflows principaux de `main` « Verify City 3B » et « Verify world and application » sont verts.
- Vercel est vert sur le dernier commit observé.

### Chantier actif — Passeport 3B V2
- identifiant public opaque séparé de `auth.users.id` ;
- contrat de scopes commun ;
- état serveur `active/suspended/revoked` ;
- timestamp d'émission et version de contrat ;
- endpoint authentifié ne retournant que l'identité publique du titulaire ;
- fondation de tickets de vérification temporaires, hashés et révocables ;
- nettoyage des anciennes données de démonstration ;
- tests anti-fuite et fail-closed.

### Nosbloc
- la V1 est fusionnée ;
- la PR #300 de staging reste volontairement séparée tant que les validations réelles demandées ne sont pas terminées.

## 5. Matrice de dépendances

| Surface | Passeport | Backend | Mobile réel | Final-art | État cible |
|---|---|---|---|---|---|
| Passeport | racine | obligatoire | obligatoire | carte UI | Release |
| Nexus / Hub | obligatoire | monde | obligatoire | Unreal/Blender | Gold Master |
| France | obligatoire | monde | obligatoire | élevé | Gold Master |
| 7 royaumes | obligatoire | monde | obligatoire | élevé | même standard France |
| 3B MA VILLE | obligatoire | ville/économie | obligatoire | assets | Release |
| Nosbloc | obligatoire | staging puis prod | obligatoire | UI | privé puis public |
| Jeux | obligatoire | sauvegarde/anti-farm | obligatoire | variable | release par jeu |
| Boutique | obligatoire pour compte | commandes | obligatoire | produit | commercial |
| Communauté | obligatoire | profils/modération | obligatoire | UI | public contrôlé |
| Sport | obligatoire pour fonctions membres | sources/consentement | obligatoire | UI | stable |

## 6. Direction artistique Monde 3B — règle non négociable

Le Hub doit rester une **grande métropole lisible**, pas un regroupement de petites plateformes :
- immense base principale ;
- quartiers réellement éloignés ;
- profondeur verticale ;
- vide maîtrisé ;
- silhouettes lointaines ;
- eau, routes, transports et transitions qui donnent l'échelle ;
- aucun remplissage artificiel uniquement pour « occuper » l'espace.

La boucle de référence est :
`Passeport -> Hub -> Royaume -> Gardien -> Fragment -> Retour Hub -> évolution du Cercle`.

## 7. Release gates

Une release majeure doit vérifier au minimum :
- tests Node et build ;
- migration integrity ;
- contrôles World/City/Nexus correspondants ;
- sécurité Supabase et permissions ;
- aucune donnée privée dans les identifiants publics ;
- aucune ancienne vue supprimée exigée par les tests ;
- taille de bundle suivie ;
- reprise après perte réseau ;
- synchronisation après retour en ligne ;
- test tactile et orientation ;
- validation sur un vrai appareil Android/Samsung avant qualification « mobile validé » ;
- sauvegarde/récupération contrôlée ;
- rollback documenté.

## 8. Ce qui reste externe ou matériel

Ces points ne peuvent pas être déclarés terminés uniquement par du code web :
- validation physique Samsung/iPhone ;
- installation et rendu Unreal final ;
- capture FPS/GPU/mobile réelle ;
- production du Passeport physique ;
- reconnaissance du Passeport par des sociétés tierces sans accord/intégration ;
- éventuelle vérification d'identité réglementée par un prestataire habilité.

## 9. Ordre de travail recommandé

1. terminer et fusionner Passeport 3B V2 après CI ;
2. validation mobile réelle du Passeport + MA VILLE + Nexus ;
3. stabilisation release/offline/E2E ;
4. final-art Hub + France ;
5. reproduire le standard sur les sept royaumes ;
6. terminer Nosbloc staging et sa modération ;
7. seulement ensuite ouvrir plus largement les intégrations externes et le Passeport physique.

Le but est de conserver un seul système cohérent plutôt que plusieurs fonctions à 80 % qui divergent.
