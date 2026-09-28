# Monde du 3B + Créer ma Ville — architecture officielle au 28 septembre 2026

## Décision produit

Les deux expériences sont désormais **séparées**.

**Passeport 3B**
- ouvre **Monde du 3B** : aventure / open world ;
- ouvre **Créer ma Ville** : city-builder / gestion.

La progression de l'une ne commande plus l'autre. Elles partagent seulement le compte, l'identité 3B, les garde-fous serveur et l'inventaire commun quand cela a du sens.

## Monde du 3B

Le runtime public officiel est le Monde 3B actuel. L'ancien runtime Origins reste une référence technique dans le dépôt mais n'est plus une destination publique.

Le Monde contient notamment :
- Cité des Huit Héritages / Hub ;
- huit pays et huit valeurs ;
- Kaïs, Gardiens, Monstre de l'Oubli ;
- missions, secrets, événements, journal ;
- PNJ, dialogues et routines ;
- transports, navigation, météo, jour/nuit ;
- eau, végétation, éclairage et patrimoine ;
- exploration, ressources, refuges, expéditions ;
- combats, compagnons et progression ;
- coopération et arène ;
- sauvegarde compte + journal hors ligne ;
- cinématiques persistantes pour entrées, histoire, restaurations, Gardiens, résultats importants et finale ;
- boutique Premium 3B séparée du gameplay obligatoire.

## Créer ma Ville

Créer ma Ville est accessible directement depuis le Passeport actif.

La progression Ville dépend uniquement de la Ville :
- constructions ;
- routes ;
- objets exposés ;
- fréquentation ;
- niveau Ville ;
- terrain ;
- quartiers.

La carte city-builder comprend :
- Cœur 3B ;
- huit quartiers ;
- routes principales et routes créées par le joueur ;
- eau / côte ;
- espaces verts ;
- bâtiments à empreinte réelle ;
- placement, déplacement, rotation ;
- collisions et zones réservées ;
- sauvegarde serveur ;
- brouillon local de reprise ;
- annuler / rétablir ;
- collection permanente ;
- visites ;
- boutique Premium Ville séparée.

## Ce qui n'est plus vrai

Les règles suivantes sont obsolètes et ne doivent plus être réintroduites :
- « premier Souvenir requis pour créer sa Ville » ;
- « synchroniser Monde → Ville pour débloquer les quartiers » ;
- « les huit royaumes commandent la progression du city-builder » ;
- « Origins est une seconde version publique du Monde ».

## Niveau de finition réel

### Monde du 3B

Le Monde est **jouable, déployé et fortement couvert par les tests**, mais il n'est pas encore déclaré « production artistique finale grand studio ».

Restent notamment à pousser :
- davantage de variété de façades et matériaux ;
- intérieurs visitables supplémentaires ;
- animations haute fidélité propres aux créatures et compagnons ;
- activités autonomes plus riches pour les habitants ;
- événements persistants transformant réellement les quartiers ;
- combat d'action libre complet si cette direction est conservée ;
- coopération Internet libre et persistante ;
- validation longue durée sur plusieurs téléphones physiques ;
- passe final de direction artistique et de performance sur les huit pays.

### Créer ma Ville

La fondation city-builder est opérationnelle, mais la simulation urbaine profonde reste à compléter :
- habitants simulés ;
- circulation ;
- besoins ;
- emplois ;
- services ;
- transport public ;
- budget municipal détaillé ;
- événements urbains ;
- davantage de bâtiments et variations 3D.

## Définition du Gold Master Monde 3B

Le Monde pourra être appelé « fini » quand :
1. un compte neuf peut terminer le parcours complet sans intervention manuelle ;
2. les huit pays ont une passe art/animation homogène ;
3. toutes les cinématiques critiques utilisent des cadrages, animations, audio et transitions validés ;
4. les principaux PNJ/compagnons ont des animations cohérentes ;
5. les performances sont mesurées sur téléphones réels bas/milieu/haut de gamme ;
6. les sauvegardes/reconnexions ont été testées sur longues sessions ;
7. l'histoire complète Kaïs → Oubli → finale → post-fin est jouable sans blocage ;
8. sécurité, mobile, accessibilité et CI restent verts.

## Sécurité

Les règles non négociables restent :
- économie et récompenses sensibles autoritaires côté serveur ;
- pas de secret serveur dans le client ;
- mutations idempotentes ;
- achats numériques attribués seulement après vérification fournisseur ;
- objets payants sans bonus de puissance ;
- remboursements/contestations révoquent les droits concernés ;
- Fortress Security et builds mobiles doivent rester verts.
