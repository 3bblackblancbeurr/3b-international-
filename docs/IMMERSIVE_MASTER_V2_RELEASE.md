# 3B International — refonte Immersive Master II

## Direction artistique et périmètre
Références visuelles données par le propriétaire le 17 octobre 2026 :
- **Concept 13** : Terre vivante, réseau international, entrée monde/hubs, prestige noir-or-bleu.
- **Concept 14** : concierge Albert, parcours quotidien, choix visuels, IA mise en scène.
- Captures créatives complémentaires : photo/portrait, scènes de jeu, cuisines, paysages, packaging, affiches, peinture.

Ce qui a été développé :
1. Accueil sur **une scène immersive à hauteur d’écran** ; 8 royaumes narratifs, liens réels et globe NASA à tracés fictifs. Fin des 22 cartes empilées.
2. Menu général **plein écran** : 8 familles en rail horizontal + recherche + vraies routes 3B. Pas de nouvelles cartes décoratives.
3. Albert public : identité holographique, dialogue guidé, panneau Explorer et panneau Ma journée accessibles sans la vieille accumulation de cadres. Aucun accès à l’Albert privé du PC.
4. Adaptation mobile automatique : le globe illustré léger se substitue à la 3D lourde sur petits appareils, économie de données / mouvement réduit et configurations moins puissantes. La sélection des royaumes reste fonctionnelle.
5. Santé : direction photo / typographie / couleurs / espaces plus cohérente, en conservant le coffre, les capteurs et les limites d’autorisations existants.
6. IA : **Studio Visuel 3B**, 8 familles / 59 inspirations réutilisables, 3 formats, saisie de sujet, préparation / copie / export de briefs locaux gratuits. Les noms de styles ne sont pas des commandes de génération d’images.
7. Companion 3B : la présence itinérante est désactivée sur Jeux, Boutique, Manga et E-sport, où elle recouvrait des titres et commandes. Les préférences utilisateur restent intactes ailleurs.
8. Tests existants actualisés pour les nouveaux composants et navigation, sans retirer les contrôles des autres modules.

## Validations avant production
- Suite Node : **2 625 réussis, 0 échec, 1 ignoré** (2 626 au total).
- Navigateur (Microsoft Edge / Playwright) : **176 validations sur 7 formats** 320×568, 320×650, 360×800, 390×844, 393×873, 768×1024, 1440×1000, sans exception JS.
- Santé : Jour / Cuisine / Aliments / Scanner / Corps / Pas visibles en simulation 360, 390, 1440 ; caméra inactive sans demande d’autorisation.
- Studio Visuel : 8 familles, édition réelle du brief, format 16:9, export du fichier .txt, retour au menu IA vérifiés sur 390 et 1440.
- Les comportements du globe 3D enrichi sur les GPU physiques, le capteur pas automatique Samsung S21, le rendu Xiaomi et les contraintes WebView sur smartphones **restent à tester sur ces appareils**.

## Limitations / travaux suivants
- Concepts 13/14 restent des **références ambitieuses** : ce code n’est ni un jeu AAA terminé ni un assistant IA personnel branché en ligne.
- Interactions globe 3D évoluées et animations cinématiques plus avancées à mesurer sur GPU cible (temps réel / autonomie / gel).
- Santé : confirmer le pédomètre automatique avec les capteurs du vrai Samsung et caméra du scanner.
- Plus d’illustrations originales haut de gamme à développer et valider module par module (voyage, communauté, boutique, esports, sport, mangas).
- L’infrastructure Passeport et le coffre Santé, les migrations Supabase, Stripe et les ports locaux d’Albert sont volontairement inchangés.
- Aucun coût supplémentaire, aucun abonnement ni abonnement Claude activé.
- Ne pas promettre de statistiques inventées : les 8 royaumes sont fictifs et les tracés sur le globe sont illustratifs.
