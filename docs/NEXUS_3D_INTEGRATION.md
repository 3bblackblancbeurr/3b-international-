# Passeport Nexus : intégration des deux livraisons

La production `ad650f3` a intégré une version illustrée pendant les contrôles de la version 3D de la PR 49. La fusion conserve tous ses fichiers, ses règles de progression et ses tests. Le composant illustré a été déplacé sans modification dans `PassportNexusIllustrated.jsx` (même blob Git).

## Affichage par défaut

`PassportNexus.jsx` charge à la demande `PassportNexusImmersive.jsx`. Il affiche le sanctuaire Three.js, les huit architectures, le Cercle Brisé, le tunnel Matrix, les commandes compactes, la pause et le mode allégé. L'ancienne version illustrée et sa feuille de style ne sont pas importées dans ce mode.

La destination utilise le moteur ACTUEL `world/origins`, sélectionné par `WorldEntry.jsx`. L'intention de déplacement expire après deux minutes, ne modifie aucune récompense et est acquittée seulement après une sauvegarde réussie. L'éveil du Cercle reste obligatoire pour un nouveau joueur. ORIGINE n'est pas une destination jouable dans ce moteur : elle reste scellée, sans inventer de récompense ni promettre un déverrouillage inexistant.

## Version illustrée conservée

Un chargement complet de `/?nexusVersion=illustre#passeport` sélectionne exactement l'expérience illustrée de `ad650f3`. Elle conserve `nexusProgress`, `enterNexusWorld` et les protections du journal de l'ancien moteur. Les deux formats de progression restent distincts : aucune migration implicite, aucun transfert d'XP ou de sceaux entre les moteurs.

Pour revenir à la 3D, charger `/#passeport` sans le paramètre. Ne pas permuter le paramètre avec history.replaceState pendant un dialogue ouvert : le chargement complet isole les styles et le cycle de vie des moteurs.

## Contrôles de livraison

Le workflow Nexus vérifie le vrai composant chargé par ce sélecteur : transition automatique, quatre formats d'écran, huit portes, visibilité des fiches en pause, absence de chevauchement, fermeture/focus, demande de destination et secours sans WebGL. La suite générale garde aussi les tests de la version illustrée. Les captures proviennent du navigateur, pas d'une image conceptuelle.

Aucun test Samsung physique n'est revendiqué. Les captures et résultats finaux sont dans l'artefact `nexus-browser-evidence` du dernier commit de la PR 49.
