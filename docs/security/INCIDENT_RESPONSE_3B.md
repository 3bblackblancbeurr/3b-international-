# 3B — RUNBOOK INCIDENT SÉCURITÉ / DONNÉES
## Document interne

Objectif : savoir quoi faire immédiatement si un compte, une clé, une base, un paiement ou des données personnelles sont suspectés d'être compromis.

## 0. Priorité absolue

1. Ne pas supprimer les preuves.
2. Bloquer l'accès compromis avec le minimum de changements nécessaires.
3. Révoquer/faire tourner le secret ou la session concernée.
4. Conserver les horaires, journaux, identifiants techniques et actions réalisées.
5. Évaluer si des données personnelles ont perdu leur confidentialité, intégrité ou disponibilité.

## 1. Si une clé/secrète est exposée

- Désactiver/révoquer la clé compromise chez le fournisseur.
- Créer une nouvelle clé avec les permissions minimales nécessaires.
- Mettre à jour le secret uniquement dans le gestionnaire du service concerné (Vercel/Supabase/Stripe/etc.).
- Ne jamais écrire la nouvelle valeur dans Git, un ticket public ou un document.
- Rechercher l'utilisation de l'ancienne clé dans les logs.
- Si la clé a été committée : considérer l'historique Git comme compromis pour cette clé, même après suppression du fichier.

## 2. Si un compte utilisateur est compromis

- Révoquer les sessions concernées.
- Forcer la récupération/réinitialisation selon le mécanisme Auth prévu.
- Vérifier les actions effectuées avec la session.
- Vérifier que les autres comptes n'ont pas été accessibles.
- Documenter la chronologie.

## 3. Si Supabase / données sont concernées

- Identifier les tables, buckets, RPC, fonctions et utilisateurs touchés.
- Vérifier RLS, grants, journaux Edge/Auth/Postgres.
- Geler les fonctions d'écriture concernées si nécessaire sans ouvrir d'autres permissions.
- Produire un export de preuves/logs pertinent avant correction lorsque c'est possible.
- Restaurer seulement depuis une sauvegarde vérifiée si l'intégrité est réellement compromise.

## 4. Si Stripe / commandes sont concernées

- Ne jamais manipuler les numéros de carte : Stripe reste le prestataire de paiement.
- Révoquer toute clé API potentiellement exposée.
- Vérifier webhooks, Checkout Sessions, PaymentIntents, refunds et compte bancaire de versement.
- Désactiver `SHOP_RELEASE_APPROVED` / `SHOP_ENABLED` en cas de doute sur l'intégrité du checkout.
- Ne pas rembourser manuellement à l'aveugle avant rapprochement entre Stripe et `shop_orders`.

## 5. Violation de données personnelles

Toujours documenter en interne :
- nature de l'incident ;
- date/heure de découverte ;
- systèmes concernés ;
- catégories de données ;
- nombre approximatif de personnes/enregistrements ;
- conséquences probables ;
- mesures prises.

Si la violation est susceptible d'engendrer un risque pour les droits et libertés des personnes, le responsable de traitement doit notifier la CNIL dans les meilleurs délais et, si possible, au plus tard 72 h après en avoir pris connaissance. En cas de risque élevé, les personnes concernées doivent également être informées dans les meilleurs délais, sauf exceptions applicables.

Source officielle :
- https://www.cnil.fr/fr/violations-de-donnees-personnelles-les-regles-suivre
- https://www.cnil.fr/fr/services-en-ligne/notifier-une-violation-de-donnees-personnelles

## 6. Registre incident minimal

Créer pour chaque incident :
- ID incident ;
- ouverture / fermeture ;
- personne qui a constaté ;
- service ;
- sévérité ;
- données concernées ;
- preuves/logs conservés ;
- secrets révoqués ;
- correctifs ;
- analyse du risque RGPD ;
- notification CNIL : oui/non + justification ;
- notification utilisateurs : oui/non + justification ;
- test prouvant la correction ;
- action préventive pour éviter la récidive.

## 7. Conditions de réouverture

Ne réactiver une fonction sensible que lorsque :
- la cause racine est comprise ;
- le secret/accès compromis est révoqué ;
- le correctif est testé ;
- les données sont cohérentes ;
- les journaux ne montrent plus l'exploitation ;
- les obligations de notification ont été évaluées ;
- les tests de sécurité concernés sont verts.
