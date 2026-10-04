# Passeport : espace vivant et or commun

## Demande

Le 5 octobre 2026, le fondateur a demandé d'enlever les cadres et textes inutiles autour du Passeport validé, de donner vie à la page et de rendre les accents dorés de toute l'application plus riches, lumineux et sobres.

## Composition

- `PassportExperience` est la page réelle, rendue depuis `App` et isolée par compte.
- `PassportVisual` reste l'unique carte ; ses données, son portrait et ses anciens chemins d'import sont conservés.
- Présentation, personnalisation et outils du Directeur sont accessibles à la demande, dans un dialogue natif avec fermeture, retour Android et restauration du focus.
- L'accès circulaire **3B MA VILLE** ouvre directement la Ville existante et ses sauvegardes. Il reste extérieur à la carte.
- La page emploie une classe indépendante des anciennes `.page-section` pour éviter les cadres et fonds opaques hérités.
- La vérification conserve la distinction identité privée / identité vérifiée, les consentements, les limites des partenaires, les échéances et la protection entre comptes. Ouvrir le dialogue ne génère ni ne partage automatiquement un code.

## Atmosphère

Le fond artistique original `public/passport/heritage-atmosphere.webp` a été généré pour cette page (1536 × 1024, 161 008 octets). Il ne contient aucune identité, aucun logo ni texte. Le rendu d'étoiles existant est réutilisé avec un hôte d'interaction explicite sur la page. Aucun nouveau moteur ou dépendance n'est ajouté.

Le décor ne capture pas les gestes et ne masque pas les commandes. Il respecte la pause utilisateur, le mouvement réduit, l'onglet masqué et l'ouverture d'un outil ou de la Ville. Le budget de rendu est borné ; les écouteurs et images intermédiaires sont nettoyés au démontage.

## Or partagé

| Rôle | Pigment |
| --- | --- |
| Or principal | `#E8B84D` |
| Reflet chaud | `#FFE6A3` |
| Or profond | `#B98528` |
| Encre des boutons | `#18140D` |

Les sources communes JS/CSS, les canaux RGB, le matériau métallique et les alias locaux partagent la même famille. Les anciennes couleurs dorées identifiées dans la navigation, les boutons, le Passeport, la Boutique et les interfaces de jeux sont raccordées à ces tokens. Les signaux de succès/alerte, les couleurs des royaumes et les assets officiels ne sont pas recolorés.

Les annotations `gold-master-allow: reviewed gold migration, existing geometry retained` concernent exclusivement des lignes CSS historiques minifiées qui réunissent des couleurs et propriétés non modifiées sur la même ligne. La migration conserve ces propriétés. Le guard de drift reste inchangé et actif ; les nouveaux fichiers consomment les tokens canoniques sans exception.

Les tests couvrent la synchronisation des palettes, les canaux RGB et les contrastes (au moins 7:1 pour les libellés or sur les fonds communs et 4,5:1 pour le texte des boutons sur chaque extrémité du matériau). Les anciens tests qui exigeaient une nuance remplacée ou l'affichage permanent du panneau de vérification sont adaptés à la demande actuelle.

## Contrôles de livraison

Vérifier la carte unique, les états invité/membre, Présenter, la fermeture et le focus, l'accès Ville et son retour, la pause/reprise, les largeurs de téléphone et le rendu bureau. Le rendu du compte fondateur ne doit jamais être simulé comme une authentification de production.
