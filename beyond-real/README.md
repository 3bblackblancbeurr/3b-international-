# 3B Beyond Real — Foundation Kit

Statut : **R&D préparatoire, isolée de 3B International**.

Ce dossier prépare le futur projet 3B Beyond Real sans brancher de XR dans l'application actuelle. Le principe est de construire d'abord les contrats, données, tests et règles de sécurité qui restent valables quel que soit le casque ou le moteur retenu plus tard.

## Ce qui existe réellement ici

- registre canonique d'IDs 3B ;
- enveloppe d'événements versionnée ;
- Memory Engine déterministe pour PNJ ;
- Passport Bridge simulé, idempotent et server-authoritative pour les récompenses ;
- séparation objet logique / ancre spatiale ;
- file offline par appareil ;
- placement sûr d'une Porte dans une pièce simulée ;
- conversion REAL SPACE / WORLD SPACE ;
- 20 pièces de référence + génération de pièces de fuzz-test ;
- Prototype 000 exécutable sans casque ;
- validation de manifests d'assets 3D ;
- profil de capacités XR ;
- tests et vérificateur automatisé.

## Ce qui n'existe PAS encore

- aucun vrai passthrough ;
- aucun tracking réel des mains/jambes ;
- aucune vraie ancre matérielle ;
- aucun Kaïs 3D final ;
- aucun Royaume MR final ;
- aucune modification du Passeport de production ;
- aucun multijoueur spatial.

## Vérification locale

```bash
node --test tests/beyond-real-foundation.test.js
node scripts/verify-beyond-real.mjs
```

Le vérificateur contrôle le registre d'assets, 20 pièces fixes, 1 000 pièces générées et le flux complet du Prototype 000.

## Garde-fou

Priorité produit : **finir 3B International et le Monde du 3B**. Beyond Real avance ici uniquement sur les fondations qui évitent du travail jetable plus tard.
