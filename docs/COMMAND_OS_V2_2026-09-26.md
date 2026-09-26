# 3B Command OS V2 — audit et état réel

Date : 26 septembre 2026  
PR : #323  
Branche : `chatgpt-command-os-master-v2-20260926`

## Principe

3B Command OS reste un cockpit propriétaire. Une donnée n’est affichée comme réelle que lorsqu’une source réellement disponible permet de l’établir. Une intégration absente n’est jamais remplacée par une valeur de démonstration.

## Socle déjà présent avant cette V2

- garde propriétaire côté serveur Supabase ;
- validation de session ;
- allowlist de commandes PC ;
- appairage et révocation des appareils ;
- journal d’audit ;
- agent PC 1.2 avec démarrage automatique Windows ;
- état Production / Supabase / GitHub Actions / PC ;
- Radar 3B avec fréquentation agrégée et anonyme ;
- mode Focus, haptique et réduction des animations.

## Corrections V2

### Mobile-first sans blocage desktop

L’interface était auparavant interdite au-delà du téléphone. La V2 conserve le téléphone comme référence d’ergonomie mais permet au propriétaire authentifié d’utiliser aussi la vue tablette/ordinateur. La sécurité ne dépend jamais du viewport : le serveur reste l’autorité.

### Santé sans faux score

Le pourcentage global a été remplacé par un compteur de signaux connus, par exemple `4/5 signaux`. Il ne prétend plus résumer des domaines qui ne sont pas connectés.

### Nexus 3B

Le Nexus expose l’état réel de chaque domaine avec une sémantique limitée :

- **Connecté** : la source répond et le signal est disponible ;
- **Disponible** : le module est réel, avec ses propres états de données ;
- **Partiel** : une partie seulement de la source est réellement disponible ;
- **Dégradé** : la source attendue répond mal ou pas au dernier contrôle ;
- **Hors ligne** : source connue mais momentanément hors ligne ;
- **Non connecté** : aucune intégration réelle n’existe encore ;
- **Contrôle…** : état pas encore déterminé.

### Command Brief

La synthèse n’utilise que :

- alertes déjà calculées ;
- santé production ;
- état CI GitHub ;
- état de l’agent PC ;
- dernière synchronisation réelle.

Aucun nombre d’e-mails, montant financier, abonné, rendez-vous ou revenu n’est généré sans source.

### Privacy Mode

Le bouton Privacy Mode masque immédiatement à l’écran :

- nom de l’appareil ;
- hostname PC ;
- code d’appairage temporaire.

Il ne modifie ni ne supprime les données serveur.

### Focus Mode

Le Focus conserve :

- état global ;
- alertes importantes ;
- objectif factuel dérivé de la priorité courante ;
- prochaine action simple ;
- disponibilité agenda, affichée honnêtement comme non connectée.

Il masque temporairement Radar détaillé, Nexus détaillé, appareils et journaux.

## Cartographie des sources après V2

| Domaine | État d’intégration | Source réelle |
| --- | --- | --- |
| Application 3B | partielle/active | contrôle production public |
| Supabase / Control Center | connectée si session propriétaire valide | Edge Function + tables privées |
| GitHub / CI | connectée si GitHub répond | API publique du dépôt |
| PC | connectée si appareil appairé | 3B Control Agent |
| Radar 3B | disponible | RPC Supabase de fréquentation |
| Sécurité | disponible | autorisation serveur + allowlist + audit |
| Vercel | partielle | santé production uniquement ; API Vercel non connectée |
| Projets 3B | partielle | activité GitHub ; jalons dédiés non connectés |
| Emails | non connectée | aucune source applicative |
| Réseaux sociaux | non connectée | aucune source applicative |
| Finances | non connectée | aucune source financière |
| Agenda | non connectée | aucun calendrier applicatif |
| 3B IA Command | non connectée | aucun service de synthèse dédié |

## Sécurité conservée

La V2 ne modifie pas la surface des commandes distantes. Les commandes restent strictement allowlistées. Il n’existe toujours pas de terminal distant arbitraire, `eval`, `new Function`, `child_process.exec` ou `shell:true` dans le chemin de commande.

L’ouverture responsive desktop ne change pas l’autorisation : une session non propriétaire ne doit pas pouvoir obtenir les données privées en appelant directement l’API.

## Performance et accessibilité

- aucun nouveau polling rapide ajouté ;
- le Nexus est purement dérivé des états déjà chargés ;
- aucune nouvelle bibliothèque ;
- aucune animation permanente ajoutée au Nexus ;
- `prefers-reduced-motion` reste respecté ;
- cibles tactiles renforcées à 44 px sur appareils à pointeur grossier ;
- les sources défaillantes conservent les dernières données valides lorsque le composant en dispose.

## Validation

État à la création de la PR : workflows GitHub en cours.

Gates avant fusion :

1. tests Node complets verts ;
2. build production vert ;
3. Fortress Security vert ;
4. build Android de test vert ;
5. build iOS simulator vert ;
6. absence de régression du Radar ;
7. recette sur vrai téléphone Android/Samsung ;
8. vérification visuelle desktop/tablette ;
9. vérification compte propriétaire vs compte non propriétaire.

Tant que les gates réelles ne sont pas validées, la V2 ne doit pas être déclarée « finie à 100 % ».


## Extension premium finalisée dans la PR #323

La même branche a ensuite été durcie sans ajouter de source fictive :

- Command Palette utilisable même lorsque le PC est hors ligne ;
- raccourci desktop `Ctrl/Cmd + K` ;
- polling Control Center avec backoff progressif jusqu’à 60 s en cas d’échec ;
- réveil immédiat à la reconnexion réseau ;
- conservation du dernier état production connu lorsque le client local perd Internet ;
- requêtes GitHub secondaires isolées pour qu’un endpoint optionnel en panne ne casse pas tout le Dev Center ;
- fréquence GitHub portée à 10 minutes pour limiter la consommation API ;
- Dev Center réel : main, dernier commit, CI, nombre réel de PR ouvertes et déploiement GitHub public lorsqu’il existe ;
- App Health réel : réseau, latence Control API, PWA/standalone, Service Worker, quota/usage de stockage et persistance lorsque le navigateur les expose ;
- Security Center : autorisation serveur, taille de l’allowlist réellement chargée, événements d’audit et appareils actifs ;
- Centre d’attention : alertes dédupliquées, priorisées et regroupées par urgence ;
- annulation des commandes PC encore en attente ;
- Projects Center : registre des projets sans faux pourcentage ; les jalons non connectés restent explicitement indiqués comme tels ;
- réglages locaux : Privacy Mode, Focus, vue compacte et réduction locale des mouvements ;
- préférences non sensibles conservées localement ; aucune permission serveur n’en dépend ;
- Error Boundary par gros module : une panne d’un panneau ne fait pas tomber tout Command OS ;
- Radar tactile : toucher une barre affiche sa valeur exacte, sans dépendre du survol ;
- cible tactile minimale renforcée sur appareils à pointeur grossier ;
- Command OS reste lazy-loaded depuis `App.jsx`.

### Sources toujours non connectées

Les domaines suivants restent volontairement sans données applicatives simulées :

- Gmail / e-mail ;
- Instagram, TikTok, YouTube et autres réseaux ;
- banque / finances ;
- Google Agenda / calendrier ;
- API Vercel complète ;
- 3B IA Command avec modèle réellement connecté ;
- jalons projet individuels mesurés automatiquement.

Leur présence dans le Nexus sert à montrer l’état d’intégration, pas à fabriquer un tableau de bord fictif.

### Règle de vérité offline

Une coupure Internet du téléphone ou de l’ordinateur client ne transforme plus automatiquement la production 3B en « panne ». Le cockpit conserve le dernier signal serveur valide et distingue la panne locale de l’indisponibilité réellement observée d’un service distant.
