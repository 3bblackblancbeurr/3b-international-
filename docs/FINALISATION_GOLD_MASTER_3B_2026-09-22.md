# 3B International — Gate finalisation / Gold Master

Date de référence : 22 septembre 2026.

Ce document sert de **source de vérité avant publication**. Une étape n'est marquée terminée que si elle est vérifiée sur le code fusionné, la production publique et, quand nécessaire, un appareil réel.

## 1. Production et CI

- [ ] `npm ci` passe sur un environnement propre.
- [ ] `npm run build` passe sans erreur.
- [ ] `npm test` passe.
- [ ] `npm run verify` passe.
- [ ] Verify shop passe.
- [ ] Verify world passe.
- [ ] Les contrôles Gold Master Unreal passent sur le projet réel et pas uniquement sur les contrats/fichiers préparatoires.
- [ ] Le commit validé est fusionné dans `main`.
- [ ] Le déploiement Vercel correspondant au SHA fusionné est SUCCESS.
- [ ] Accueil, Passeport, Monde du 3B, Boutique, Découvrir 3B et guides d'installation répondent en production.

## 2. Parcours utilisateur

Parcours principal canonique :

**Accueil → Passeport 3B → Monde du 3B → Boutique**

La Ville 3B reste une expérience liée au Passeport et à la progression. **Le Nexus n'est pas un hub du Monde : il sert uniquement de portail vers Créer sa ville 3B.**

Critères :
- [x] Navigation rapide : Accueil / Passeport / Monde / Boutique.
- [x] Manga et Secret 3B séparés dans une zone « À venir ».
- [x] Le cœur visuel du Monde n'est plus libellé « Nexus ».
- [ ] Vérifier qu'aucun écran public ne présente encore Nexus comme destination concurrente du Monde.
- [ ] Vérifier le parcours complet avec retour arrière Android et navigation tactile.

## 3. Boutique Premium

Déjà préparé sur la branche de finalisation :
- [x] Grande image produit.
- [x] Produit non recadré grâce à `object-fit: contain`.
- [x] Ouverture plein écran.
- [x] Photo précédente / suivante.
- [x] Navigation clavier.
- [x] Swipe tactile en plein écran.
- [x] Miniatures.
- [x] Présentation mobile occupant la majorité de l'écran.
- [x] Bouton d'achat plus accessible sur mobile.
- [x] Landing page Boutique publique reconstruite.

Restant avant ouverture commerciale :
- [ ] Photos finales face.
- [ ] Photos finales dos.
- [ ] Gros plans relief 3B / matière / coutures.
- [ ] Photos portées homme et femme si disponibles.
- [ ] Tailles définitives.
- [ ] Couleurs définitives.
- [ ] Logos/variantes réellement vendables.
- [ ] État produit explicite : En stock / Précommande / Épuisé.
- [ ] Quantités et limites de précommande.
- [ ] Fenêtre d'expédition.
- [ ] Livraison et retours validés.
- [ ] Mentions vendeur validées.
- [ ] Test Stripe de bout en bout.
- [ ] Paiement réel activé uniquement après validation de tous les points précédents.

## 4. Monde du 3B

À valider sur runtime réel :
- [ ] 8 territoires accessibles selon la progression prévue.
- [ ] 8 gardiens identifiables visuellement.
- [ ] Armes et évolution fonctionnelles.
- [ ] Pouvoirs et feedbacks visuels lisibles.
- [ ] Quêtes principales et courtes quêtes signatures vérifiées.
- [ ] Caméra tactile sans clipping bloquant.
- [ ] Joystick et commandes confortables sur téléphone.
- [ ] HUD lisible.
- [ ] Sauvegarde et reprise.
- [ ] PNJ / événements / transports actifs là où ils sont annoncés.
- [ ] Ambiances pays différenciées.
- [ ] FPS et mémoire acceptables sur le téléphone cible.
- [ ] Aucun système préparatoire n'est présenté comme « terminé » s'il n'est pas réellement actif dans le runtime.

## 5. Ville 3B

- [x] Mode « Crée ta ville 3B » présent.
- [x] Construction, quartiers, collection, visite et paramètres structurés.
- [x] Nexus City Gateway décrit le Nexus comme portail vers la Ville.
- [ ] Tester création de ville avec un compte réel.
- [ ] Tester construction, suppression, déblocage de quartier et persistance.
- [ ] Tester synchronisation Monde → Ville.
- [ ] Tester reconnexion sur un autre appareil.

## 6. Android / PWA

- [x] Manifest PWA.
- [x] Guide Android.
- [x] Guide iPhone.
- [ ] Vérifier visuellement les icônes maskable sur Samsung.
- [ ] Désinstaller / réinstaller et vérifier que l'ancienne icône n'est plus conservée.
- [ ] Vérifier mode standalone.
- [ ] Vérifier bouton Retour Android.
- [ ] Vérifier ouverture depuis QR et liens publics.
- [ ] Générer et signer l'AAB final quand la release native est prête.
- [ ] Tester l'AAB release avant soumission Google Play.

## 7. Google / découvrabilité

- [x] URL publique stable définie.
- [x] `robots.txt` présent.
- [x] `sitemap.xml` présent.
- [x] Page Découvrir 3B.
- [x] QR Découvrir 3B.
- [x] Landing Boutique avec image produit et données structurées.
- [ ] Contrôler que toutes les URL importantes répondent 200 en production.
- [ ] Soumettre/contrôler le sitemap dans Search Console.
- [ ] Inspecter Accueil, Découvrir, Passeport, Monde, Boutique et Installation.
- [ ] Vérifier canonical, Open Graph et image de partage en production.
- [ ] Suivre les premières impressions/clics après indexation.

## 8. TikTok de lancement

- [x] Storyboard final préparé dans `docs/TIKTOK_3B_LAUNCH_20S_2026-09-22.md`.
- [ ] Capturer la version finale réellement déployée.
- [ ] Exporter 1080×1920.
- [ ] Vérifier lisibilité du texte dans la safe zone.
- [ ] QR final visible et scannable.
- [ ] Publier uniquement après validation du parcours public.

## Definition of Done

Le périmètre n'est « finalisé » que lorsque :
1. le code fusionné est vert ;
2. la production correspond au SHA validé ;
3. le parcours principal fonctionne sur téléphone ;
4. le Monde et la Ville sont validés sur runtime réel ;
5. la boutique montre correctement le produit et le paiement est soit validé, soit clairement verrouillé ;
6. les pages publiques sont accessibles et indexables ;
7. la vidéo de lancement montre la version réellement publiée.
