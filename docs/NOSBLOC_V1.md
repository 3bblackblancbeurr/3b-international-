# Nosbloc du 3B — état réel au 28 septembre 2026

## Vision

Nosbloc du 3B est la plateforme créateur de l'écosystème 3B.

Son premier Bloc officiel reste **3B MA VILLE**, sans renommer ni dupliquer la Ville 3B. Le Passeport 3B reste l'identité unique.

## Ce qui existe réellement

Le code V2 Premium existe avec :
- Accueil / Explorer / Créer / Activité / Moi ;
- Studio Simple et Pro ;
- projets, assets, scripts et brief IA ;
- sauvegarde locale de secours ;
- export/import avec empreinte de contrôle ;
- versions figées ;
- restauration vers nouveau brouillon privé ;
- équipes, invitations et répartition à 100 % ;
- droits et classification avant révision ;
- tests privés ;
- envoi en révision sans publication directe ;
- intégration de 3B MA VILLE ;
- interface mobile / touch / reduced motion.

Le backend production contient :
- `nosbloc_projects` ;
- `nosbloc_project_versions` ;
- `nosbloc_project_members` ;
- `nosbloc_invitations` ;
- `nosbloc_products` ;
- `nosbloc_orders` ;
- `nosbloc_entitlements` ;
- `nosbloc_ledger_entries` ;
- `nosbloc_wallet_balances` ;
- `nosbloc_refund_requests` ;
- `nosbloc_payout_requests` ;
- `nosbloc_moderation_queue` ;
- `nosbloc_audit_log`.

L'Edge Function `nosbloc-api` est déployée avec JWT obligatoire et des RPC autorisés côté serveur.

## État public actuel

**Nosbloc reste volontairement EN PRÉPARATION dans l'application publique.**

La route est conservée mais bloquée avant rendu par le shell principal.

La configuration production actuelle garde :
- serveur Nosbloc : actif ;
- Discover public : désactivé ;
- paiements : désactivés ;
- retraits créateurs : désactivés.

Cela signifie que l'infrastructure cloud existe, mais que l'ouverture commerciale/communautaire n'est pas encore autorisée.

## Ce qui manque avant ouverture publique

### Produit / création
- test complet d'un compte neuf : créer → modifier → sauvegarder → fermer → reprendre ;
- test cloud multi-appareils ;
- test privé d'une version figée ;
- restauration et conflits de versions ;
- limites de taille pour assets/scripts réellement chargés ;
- validation performance mobile sur téléphones physiques.

### Discover
- modération opérateur réellement exercée ;
- signalement utilisateur ;
- blocage / masquage ;
- procédure d'appel ;
- classification âge/contenu ;
- contrôle des droits sur les assets ;
- règles de classement anti-spam / anti-bot ;
- beta sur invitation avant ouverture générale.

### Économie créateur
- aucun paiement réel n'est autorisé aujourd'hui ;
- aucun retrait réel n'est autorisé aujourd'hui ;
- KYC/KYB, âge, fiscalité et TVA à finaliser ;
- prestataire de paiement créateur à brancher ;
- réserve remboursements/chargebacks ;
- réconciliation comptable ;
- procédure de litige ;
- limites et détection antifraude ;
- pilote manuel avant automatisation.

## Principe financier

Les Coins 3B restent une monnaie fermée de plateforme. Ils ne sont pas une crypto.

Un solde euro ne doit jamais être modifié directement par le navigateur. Le ledger serveur est la source de vérité.

## Définition de « fini »

Nosbloc ne sera déclaré fini public que lorsque :
1. la création et la reprise fonctionnent sur mobile réel ;
2. les versions privées sont immuables ;
3. Discover a modération, signalement et appel ;
4. les droits d'assets sont contrôlés ;
5. les équipes acceptent réellement leurs accords côté serveur ;
6. les flux de paiement/remboursement/retrait sont audités ;
7. KYC/fiscalité sont validés ;
8. les tests sécurité, charge, mobile et récupération sont verts ;
9. la beta invitation a confirmé que le système tient avec de vrais créateurs.

## Décision actuelle

Conserver Nosbloc verrouillé publiquement est volontaire et correct tant que les garde-fous ci-dessus ne sont pas terminés.
