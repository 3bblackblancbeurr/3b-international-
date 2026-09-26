# 3B MASTER EXECUTION MAP — 26 septembre 2026

## Règle d'architecture
Le Passeport 3B est la racine d'identité unique. Aucun module ne crée sa propre identité membre.
Chaîne canonique : Auth 3B -> Profil membre -> Passeport 3B -> droits applicatifs -> Monde/Jeux/Nosbloc/Boutique/Communauté.

## Ordre de livraison
P0 — identité, sécurité, migrations, CI, sauvegarde.
P1 — Passeport, économie unifiée, MA VILLE, Nexus/Hub.
P2 — boucle Monde : Hub -> Royaume -> Gardien -> Fragment -> Retour Hub.
P3 — France Gold Master, puis industrialisation des sept autres royaumes.
P4 — jeux actifs, Nosbloc, Boutique, Sport et modules éditoriaux.
P5 — interopérabilité externe du Passeport.

## Gates obligatoires
1. CI verte et manifeste Supabase réconcilié.
2. Aucun test ne référence un écran supprimé.
3. E2E compte A / compte B : aucune fuite de Passeport.
4. Wallet/XP/inventaire autoritaires côté serveur et idempotents.
5. sauvegarde/restauration testée.
6. mode réseau faible/offline dégradé sans corruption.
7. build mobile réel + recette Samsung.
8. bundle mesuré et budgets de taille fixés.
9. journal sécurité et révocation d'identité disponibles.
10. rollback documenté avant toute fusion production.

## Hub premium
Conserver une grande base cohérente, des quartiers éloignés et du vide maîtrisé.
Interdiction de résoudre la densité par de petites plateformes collées.
Le rendu final doit séparer blockout, assets finaux, VFX, eau, lumière, PNJ, audio, cinématiques, intérieurs, navigation et optimisation.

## Royaumes
France sert de vertical slice de référence. Aucun autre royaume n'est déclaré final avant parité avec la France sur :
environnement, gardien, quête/combat, cinématique, récompense, retour Hub, performances et tests.

## Gouvernance
Chaque chantier a un propriétaire logique, une branche, un gate CI et un document de sortie.
Les expérimentations ne modifient pas directement main.
