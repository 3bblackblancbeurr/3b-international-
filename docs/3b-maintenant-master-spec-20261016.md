# 3B Maintenant — direction produit, sécurité, critères de sortie (16 octobre 2026)

## Intention
Une seule nouvelle porte dans le menu principal, six expériences utiles. Le portail illustré et le Cercle Brisé animé du Monde du 3B restent intacts. Aucune duplication des modules existants.

## Les six expériences
1. **Boussole 3B** — six intentions, temps et rythme ; parcours guidés de trois étapes connectées aux vraies rubriques ; coches manuelles sans faux XP.
2. **Cercle Vivant** — les huit valeurs, gardiens et pays canoniques ; exploration personnelle facultative avec progression locale non certifiée.
3. **Coup de Main** — trois idées et une proposition à préparer dans la Communauté existante ; aucune publication automatique ni partage de contact personnel.
4. **Scanner Utile** — accès au scanner existant ; lecture locale et volontaire de code-barres via BarcodeDetector sur photo si supporté. Pas d'OCR, traduction ou reconnaissance de produits prétendus.
5. **Héritage 3B** — coffre privé local chiffré AES-256-GCM, PBKDF2-SHA-256 600 000 itérations, sel aléatoire et nonce neuf pour chaque sauvegarde ; export/import, verrouillage et effacement explicite. Jamais de synchronisation serveur.
6. **Mode Universel** — lecture facilitée, contraste, animations calmes et lecture vocale déclenchée uniquement par l'utilisateur.

## Direction artistique
Noir obsidienne, or champagne et bleu Matrix ; une scène hero, une navigation simple, une action principale par écran. Pas d'accumulation de cadres, badges, états d'administration ou animations gratuites. Révéler les détails secondaires au moment utile. Commandes accessibles au clavier, au toucher et avec mouvement réduit.

## Harmonisation
Le socle existant de styles partagés simplifie déjà les surfaces de navigation, commerce, compte et contenu. Conserver les cartes d'identité, données essentielles et composants des jeux. Toute suppression ultérieure de conteneur nécessite des captures et tests de non-régression. Qualité AAA = soin visuel et technique, sans ajouter un moteur 3D inutile.

## Sécurité et honnêteté
- Aucune nouvelle souscription ni fournisseur externe.
- Pas de géolocalisation, de microphone ni de caméra automatique.
- Aucun texte de mémoire n'est envoyé sur le réseau par Héritage. Chiffrement uniquement local ; phrase secrète irrécupérable et limites d'un appareil compromis clairement expliquées.
- Repères du Cercle ≠ validation d'une action, XP, Passeport ou certificat.
- L'entraide avec organisateur, rencontres et modération certifiée est un projet ultérieur nécessitant protections et vérifications.
- Les données Santé, Passeport, boutique et sauvegardes de jeux ne sont pas modifiées.

## Vérifications avant publication
Tests unitaires des modèles et du coffre cryptographique ; navigation, build, sécurité, monde et jeux ; screenshots Chromium 320/390/768/1440 px ; contrôle du rendu mobile et de l'absence de débordement ; Vercel production READY et commit exact vérifiés.

## Limites futures explicites
OCR/traduction, analyse nutritionnelle vérifiée par le scanner, missions géolocalisées, organisateurs approuvés, voix conversationnelle et synchronisation multi-appareils ne sont pas intégrés à cette première livraison.
