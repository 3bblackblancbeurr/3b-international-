# Finalisation 3B — preuves du 4 octobre 2026

## Base et périmètre
Travail parti de main abb92454, puis intégration de 9a1f0b86 (licence Pillow du Creator Batch Studio). PR P0 séparée pour livrer les corrections publiques indépendamment du moteur Monde. PR de consolidation #440 part du main actuel ; #411 et #432 sont conservées tant que le remplacement n’est pas effectivement validé et fusionné.

## P0 et P1
Accueil : entrée Monde unique, signature Cité. Découvrir : saut de ligne parasite supprimé, Passeport décrit comme identité. Guide Android : Chrome et Samsung Internet, manifeste et worker /sw.js. Maskable : 192/512 depuis l’asset 3b-maskable-512, noms versionnés 20261004 ; logo dans la zone sûre. Sitemap : dates des seules pages modifiées.
PR P0 #441 fusionnée au commit 750f288d après quatre workflows et Vercel réussis ; nouveau QR Découvrir décodé depuis une capture réelle à 210 px. HTTP public : accueil, Découvrir, Android, Boutique, manifeste et QR répondent 200. Catalogue public observé : vide, paiement désactivé. GSC Wizard : accès refusé pour abonnement expiré ; aucune souscription engagée. L’absence de résultat de recherche ciblée ne prouve pas une absence d’indexation.

## P2
Récupération sélective de #411 : exploration persistante, journal, tournoi France, sauvegardes résistantes aux coupures et réglages visuels. #432 : îlots, architecture, végétation, cascades, huit portes et armurerie avec seize captures réelles de modèles.
Les obstacles partagés du moteur viennent des 374 empreintes de la géométrie finale ; le test compare le rendu et l’autorité, y compris les limites d’eau. Génération : node scripts/prepare-hub-physics.mjs, puis node scripts/prepare-world-engine.mjs chemin_externe.json.
Le paquet de déploiement part maintenant de index.ts et inclut global-rewards.js. Le candidat world-engine-goldmaster-candidate est déployé en version 9, JWT requis ; 57 fichiers relus identiques au paquet, OPTIONS 204 et POST sans authentification 401. Production world-engine v26 inchangée pendant la recette.
Tests navigateur compilé : ordinateur/journal/reprise, tournoi tactile/rechargement/abandon sans récompense, rotation/préférences/perte WebGL/limite de Cité. Ces tests sont des émulations avec rendu logiciel, sans mesure de chauffe, batterie ou coopération entre comptes réels.

## Exceptions artistiques au garde visuel
Les pigments de matériaux physiques, lumière de studio et végétation 3D nécessitent des valeurs numériques pour Three.js. Les drapeaux gardent leurs pigments nationaux. Les exceptions sont marquées uniquement sur les lignes concernées dans cite-surfaces, cite-vegetation, gate-identity, platform-scene, WeaponShowroom et weapon-model ; elles ne dispensent pas l’interface du design system. Les boutons de l’armurerie emploient Button ; les nouveaux styles et l’emblème SVG utilisent les tokens partagés.

## P3
Compte confirmé par le propriétaire : 3b international, mode test, acct_1UEaJ7FoSvOQXgpc. Deux pulls existants noir/blanc à 80 EUR, huit logos pays par couleur. Prix par défaut France et liste explicite des variantes ajoutés en test ; aucun ancien produit réactivé. Webhook test : paiement terminé, paiement asynchrone réussi, charge.refunded et checkout.session.expired.
L’API n’expose que le prix par défaut et les variantes publiées explicitement du même produit ; les prix historiques restent exclus. Le Live exige aussi SHOP_E2E_APPROVED, SHOP_INVENTORY_APPROVED et SHOP_SELLER_APPROVED. Tous restent false par défaut. 53 tests checkout, vendeur, notification, remboursement et stock ont réussi.
Stock atomique implémenté avec réservations durables, concurrence sans survente, reprise idempotente après réponse perdue et restitution après expiration Stripe confirmée. Migration appliquée uniquement à 3BNosblocStaging (zykdfgahzqqanlyxjtbe) ; vérification SQL réelle réussie et données de recette annulées. Tests locaux avec PGlite, SDK Stripe et webhooks signés ; aucune vente Stripe réelle simulée sur les services externes. Base de production observée : aucun vendeur shop_staff, aucune commande test ; migration et quantités de stock non activées en production. Aucune identité légale, taille, matière, quantité réelle ou photo physique n’a été inventée. La recette Stripe → Supabase → vendeur → notification → remboursement sur services réels reste à prouver avant ouverture.

## P4
Storyboard remplacé : entrée 3B → identité Passeport → Cité → quartier/porte → Gardien → arme/pouvoir → quête → Boutique → QR Découvrir. Master 1080×1920, QR fixe trois secondes. Captures finales, scan sur second téléphone et export restent à effectuer après déploiement validé.
