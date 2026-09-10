# Refonte 3B — état et activation
Version du 11 septembre 2026. Application : https://3b-international.vercel.app

La correction [FIDELITE-BOUTIQUE-3B.md](FIDELITE-BOUTIQUE-3B.md) ajoute quatre cartes commerciales pour les vêtements et accessoires et conserve les huit cartes XP séparément. Un compte de modération dédié est maintenant créé et ses accès ont été remis en privé.

La révision mobile décrite dans [MOBILE-PREMIUM-3B.md](MOBILE-PREMIUM-3B.md) complète cet état : cases compactes, guide XP en dernier, atelier de 69 pièces en trois étapes, conversation IA automatique et charte obligatoire pour le salon. Ce document décrit aussi les derniers contrôles et les activations encore nécessaires.

## Modifications
- Accueil : une seule barre brillante, douze cartes uniformes en trois groupes ; Mon espace reste dans la navigation, sans case répétée dans le menu.
- Fond original background.png rétabli et animé ; préférences de mouvement respectées.
- Passeport : pluie Matrix plus dense, circuits lumineux et balayage, confinés à la carte ; pause disponible.
- Fidélité : huit illustrations originales, une par niveau, bordure métallisée, nom du membre et export SVG autonome qui embarque le dessin.
- Guide & XP : gains, plafonds, huit niveaux, points, réductions et annuaire des rubriques.
- Secret : 3B en relief tournant et Bientôt intermittent. Manga : Bientôt. Religion remplace Musique.
- Communauté : profils publics volontaires, membres et créateurs, publications, concepts de l’atelier, votes, suivi, blocage réciproque, signalements et file de modération ; trois salons avec Supabase Realtime et reprise par interrogation toutes les 15 secondes.
- Sport : vrais titres des sept derniers jours, France 24 et BBC Sport, dates, liens et filtres. Cache de 10 minutes, interrogation de la page toutes les 5 minutes et actualisation quotidienne à 04:00 UTC. La couverture dépend des deux sources ; les scores en direct et une couverture exhaustive de chaque sport restent à intégrer.
- IA : deux entrées. Atelier de 69 types de pièces et accessoires en trois étapes, matières, coupes, motifs, couleurs, face/dos, brief exportable et partage à relire. Trois adaptateurs de conversation OpenAI, Anthropic et Google ; génération textile OpenAI. Les services IA payants restent désactivés.

## Ce qui reste à configurer
Les services IA et commerciaux restent à configurer ; le compte de modération est maintenant créé.

1. Se connecter au compte de modération avec les accès remis en privé. Le rôle est attribué et l’accès à la file est vérifié. Compléter le profil et accepter la charte pour participer au salon.
2. Renseigner les clés et les modèles IA côté serveur dans les secrets de la fonction Supabase ecosystem :
   AI_ENABLED=false initialement ;
   OPENAI_API_KEY, OPENAI_CHAT_MODEL, OPENAI_IMAGE_MODEL ;
   ANTHROPIC_API_KEY, ANTHROPIC_CHAT_MODEL ;
   GEMINI_API_KEY, GEMINI_CHAT_MODEL.
   Utiliser des modèles accessibles au compte ; le modèle image doit accepter 1024×1024, quality medium et renvoyer b64_json. Les clés ne vont jamais dans le navigateur, le dépôt ou le chat. Tester chaque fournisseur avant AI_ENABLED=true.
   Limites actuelles : 20 demandes texte et 3 images par membre par jour ; 100 demandes texte et 20 images pour tout le site par jour. Ce sont des plafonds de requêtes, pas un budget monétaire. Paramétrer également les budgets chez les fournisseurs.
3. Boutique : catalogue réel, photos, prix TTC, tailles, couleurs, quantités disponibles, livraison, retours et coordonnées du vendeur. Compléter les cinq pages commerciales puis leurs URL HTTPS. Configurer Stripe en mode test, son webhook, la livraison et les accès privés de stockage des commandes. Voir docs/AJOUTER-MES-VETEMENTS.md et les étapes de docs/ACTIVATION-PAIEMENT.md (son introduction historique n’est plus l’état de déploiement actuel).
   SHOP_ENABLED demeure false tant que ces éléments ne sont pas configurés. Aucun produit, tarif ou vendeur fictif n’a été ajouté. Le code existant vérifie les prix et les quantités maximales par commande ; il ne réserve pas le stock physique. Prévoir une gestion de stock atomique avant de vendre des séries limitées. Un vrai parcours complet Stripe TEST (paiement, webhook, confirmation, remboursement) reste à faire avec les accès.
4. Supabase Auth : activer la protection contre les mots de passe compromis dans le tableau de bord si disponible pour le projet. L’audit Supabase la signale désactivée ; aucun réglage du compte propriétaire n’a été inventé.

## Sécurité et limites de vérification
Les nouvelles tables ont RLS. Les écritures passent par la fonction, qui vérifie l’utilisateur ET une session encore active. La fonction a verify_jwt=false pour permettre les routes sport publiques et effectue sa propre authentification pour chaque action privée. Les secrets IA sont côté serveur et les images générées dans un bucket privé avec liens temporaires. Les quotas limitent le spam ; le statut modérateur provient exclusivement d’une table privée.
L’ancien tchat anonyme inutilisé a perdu ses droits publics ; ses données ont été conservées.
Tests SQL en transaction annulée : isolation des comptes, blocage dans les deux sens, session révoquée, refus des écritures directes, refus anonyme, rapports et rôles privés. Aucun compte de test conservé.
Tests HTTP : capacités IA désactivées, actualités disponibles, écriture anonyme 401, origine étrangère 403, méthode non autorisée 405. Tests Node existants et nouveaux : 109 tests réussis au dernier passage. Les appels payants IA et un paiement Stripe réel n’ont pas été exécutés.
Le code et ces vérifications réduisent les risques ; ils ne constituent pas une certification de sécurité ni une garantie de modération humaine immédiate.

## Déploiement du service
Appliquer supabase/ecosystem.sql puis supabase/ecosystem-hardening.sql une fois via migrations. Ils ont déjà été appliqués au projet ttvhcezucsbbmnafrotq.
Déployer supabase/functions/ecosystem/index.ts avec ses dépendances sports.js, studio.js et ai-router.js. La version 4 est active. La migration additive supabase/community-enrollment.sql a également été appliquée ; supabase/community-enrollment-test.sql vérifie ses protections sans conserver les données de test.
shared/studio.js réexporte le schéma de la fonction, utilisé aussi par le configurateur : une seule source de validation.

## Illustrations
Créées avec l’outil image_gen intégré, puis encodées en WebP pour le site sans changer le dessin. Les huit prompts sont conservés dans docs/loyalty-art-prompts.json. Aucun appel aux futures clés IA de l’application n’a été nécessaire.
