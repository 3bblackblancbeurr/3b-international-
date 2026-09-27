# 3B GOLD MASTER — Foundation rollout

Cette branche pose la couche commune avant toute refonte écran par écran.

## Verrouillé ici
- Obsidian / Carbon / Champagne / Champagne Highlight / Matrix ;
- grille 4 px et espacements 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 ;
- rayons 8 / 12 / 16 / 24 ;
- timings 160 / 250 / 380 ms ;
- Obsidian Glass, Champagne Metal, Matrix Glass ;
- Button, Card, Modal, Toast, Tabs, VideoPlayer, Avatar, Badge, Progress, Stat ;
- aliases CSS temporaires pour ne pas casser les écrans existants ;
- reduced-motion ;
- coffre de marque bootstrap ;
- CI dédiée.

## Important
Cette fondation ne prétend pas que les neuf logos officiels existent déjà dans le dépôt. Elle refuse au contraire d’en inventer.
Elle ne fusionne aucune ancienne PR divergente et ne supprime aucun composant métier.

## Ordre après validation
Accueil/navigation → Passeport → Command OS → ALBERT → Sport → Nosbloc → Boutique → Communauté → Jeux/Monde.

Chaque écran doit ensuite passer Nettoyage → Gold Visual → Gold Functional, avec mobile, erreurs, offline, performance, sécurité, tests et rollback.
