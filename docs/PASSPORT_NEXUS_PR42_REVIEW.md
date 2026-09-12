# PR #42 — reprise et validation du Passeport Nexus

## Décision : fusion non approuvée

Révision de départ : `361f9133ea37a0329002affbb781bcb81d7cbcd4`.
Branche vérifiée : `chatgpt-improvements`.
Main observée : `a29e46d87984b7bcc4c4c806515b2449f657583d`.
La PR est ouverte, non brouillon, et GitHub indique des conflits de fusion.
Le passeport/Nexus a également été publié séparément dans main. Ne pas réintroduire une version plus ancienne du monde.

## Corrections de cette reprise

- Le Nexus utilise un portail React et un vrai dialog modal : pas de découpage par les transformations de la carte, focus initial, boucle Tab/Maj+Tab, Échap, restitution du focus et des styles de défilement. Repli sans showModal inclus.
- La séquence n’est plus redémarrée lorsque le parent recrée son callback onClose. Les minuteries sont annulées à la fermeture et par « Passer le tunnel ».
- Le mode calme du passeport, y compris sa pause manuelle, est transmis au Nexus. Les animations et pseudo-éléments sont arrêtés en mode réduit.
- Les huit destinations utilisent les identifiants canoniques France, Algérie, Espagne, Maroc, Italie, Tunisie, Turquie et Estonie. L’ancien simple marqueur `3b:nexus-country` n’est plus écrit comme s’il suffisait à effectuer un voyage.
- L’adaptateur de CETTE BRANCHE utilise `loadWorld`, `applyWorldAction`, `recordWorldAction` et `readLocal`, avec l’identifiant du compte courant, ou null pour l’invité. Aucun compteur de gains, sceau ou reconstruction n’est attribué par l’interface.
- Changer de pays passe par la commande normale de retour au hub. Un combat ou un pacte inachevé est conservé. Explorer reprend sans générer de commande.
- ORIGINE lit les sceaux et les reconstructions réels du moteur classique. Son seuil est huit sceaux ET huit pays reconstruits, comme la commande finale existante. Elle ouvre le défi de l’Union existant : aucune nouvelle zone ORIGINE 3D n’est créée par ce patch. Une rencontre finale existante est reprise sans la recréer.
- Un double appui est bloqué. Une fermeture ou un changement de compte pendant le chargement empêche l’enregistrement d’un nouveau trajet et la navigation tardive.

## Contrôles exécutés localement

- `node --test tests/passport-nexus.test.mjs` : 35 réussites, 0 échec.
- Syntaxe des deux composants JSX : aucune erreur avec transpileModule TypeScript. Ce contrôle n’est pas un build Vite complet.
- `python tests/check-dialog.py` : essais isolés du véritable helper de dialog et de sa feuille CSS dans Chromium 144. Formats 320×640, 390×844, 844×390, 1440×900. Focus, boucles clavier, modalité native, pleine fenêtre, Échap, restauration des styles/focus, réouverture, préférences de mouvements réduits : réussis. Repli sans showModal et nettoyage répété : réussis.
- Le fichier PassportVisual d’origine a été reconstitué à l’octet près et son SHA de blob comparé : `071c64af041656e980dfd19eac0dea69c0d8c853`. Seule la transmission du mode calme est modifiée dans ce fichier.
- Les tests de routage utilisent un adaptateur simulé pour observer les commandes et les comptes : ils ne prouvent ni une synchronisation Supabase réelle ni un passage 3D complet.
- Le banc Chromium n’est PAS l’application React complète ni une capture du déploiement Vercel. Aucun Samsung physique, Safari iPhone, WebGL, performance GPU ou lecteur d’écran n’a été validé.

## Bloquants qui restent avant fusion

### 1. Concilier la branche avec le moteur Origins présent dans main

La branche PR #42 ouvre encore `src/world/WorldPage.jsx`. Main passe par `src/world/WorldEntry.jsx`, qui ouvre `origins/OriginsPage.jsx` par défaut et garde l’ancien monde comme repli.
L’adaptateur livré ici appartient explicitement au moteur classique et à son format de sauvegarde. Fusionner les fichiers sans réadapter cette entrée afficherait potentiellement les clés de l’ancien monde puis ouvrirait Origins : ce serait une régression.

Préserver le moteur Origins et les améliorations déjà publiées, choisir sa source réelle de progression pour le Nexus, puis brancher les huit destinations et ORIGINE sur cette même source. Ne pas migrer ni assimiler automatiquement les clés entre moteurs. Résoudre ensuite les conflits sans écraser les autres travaux de main et relancer les tests sur le résultat fusionné.

### 2. Vérifier le build du nouveau head et le parcours complet sur une preview accessible

Le succès Vercel signalé pour `361f913...` ne certifie pas ce correctif. Contrôler le statut du nouveau head, les imports et le build, puis tester le véritable parcours : passeport → scan/tunnel ou Passer → Nexus → pays → retour ; 0/7/8 sceaux ; reconstructions incomplètes/complètes ; invité/compte connecté ; fermeture pendant chargement ; combat/pacte en cours ; mode calme ; portrait/paysage ; console sans erreur et sauvegarde retrouvée après rechargement.

Les tentatives du connecteur Vercel n’ont pas donné accès à la preview protégée ; la liste d’équipes retournée était vide. Aucune protection d’authentification n’a été désactivée. Fournir une preview autorisée ou vérifier dans une session Vercel déjà authentifiée, sans exposer de secrets.

### 3. Revoir les autres fonctions incluses dans la PR #42

La PR mélange cinématiques, visibilité web et préparation Play avec le passeport. Cette revue n’approuve pas ces autres livraisons. La description de PR indique notamment que le service de suppression de compte Supabase n’est pas encore déployé et que des cinématiques restent non raccordées. Les isoler ou obtenir leur validation propre avant de fusionner toute la PR.

Aucune fusion, aucun changement de main, aucune migration de sauvegarde, aucun changement des règles de récompense et aucune publication en production n’ont été demandés par ce correctif.
