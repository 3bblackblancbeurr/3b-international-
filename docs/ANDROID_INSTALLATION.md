# Installer 3B depuis le site

La page d’introduction et l’accueil proposent « Installer 3B », sans demander de compte. Le navigateur confirme l’installation. Le manifeste définit le nom, l’icône, l’adresse de lancement et l’ouverture autonome. Les PNG sont des rendus du favicon 3B existant ; la variante Android maskable conserve une marge autour du monogramme.

Le bouton utilise `beforeinstallprompt` lorsque le navigateur le fournit. Sans cette possibilité, il ouvre une aide adaptée à Android, iPhone ou ordinateur, avec le lien public à copier. Le lien copié ne contient ni code d’invitation, ni paramètre de connexion. Le bouton disparaît dans une fenêtre autonome ou à réception de `appinstalled`. Accepter la demande affiche seulement « Installation demandée » tant que le navigateur n’a pas confirmé la fin.

L’installation est proposée depuis le site HTTPS. Cette livraison ne fournit pas d’APK signé ni de publication Play Store/App Store. Le navigateur et l’appareil déterminent les possibilités d’installation ; les navigateurs intégrés aux messageries peuvent proposer uniquement un raccourci. Internet reste nécessaire. Aucun service worker ni cache applicatif n’est ajouté : les pages, comptes et nouvelles versions continuent à utiliser le réseau comme auparavant.

## Vérification ciblée sur Samsung physique

1. Noter le modèle Galaxy, la version Android, le navigateur et sa version.
2. Ouvrir l’URL de production dans Chrome ou Samsung Internet, sans navigation privée. Vérifier qu’« Installer 3B » est visible avant connexion.
3. Toucher le bouton. La demande du navigateur doit afficher le nom 3B International et le monogramme 3B. Si l’aide apparaît, suivre le menu du navigateur et noter exactement l’option proposée.
4. Confirmer sur le téléphone et ouvrir 3B depuis la nouvelle icône. Vérifier l’ouverture, le nom et l’absence du bouton d’installation dans une fenêtre autonome. Un raccourci qui ouvre un onglet n’est pas une validation de l’installation autonome.
5. Vérifier portrait, paysage, fermeture de l’aide et boutons accessibles sans débordement horizontal. Revenir à l’accueil puis ouvrir Le Monde du 3B.
6. Dans le Monde 3B, conserver la qualité Automatique : déplacement et caméra à deux doigts, traversée de deux pays et attaque/esquive pendant le déplacement. Relever tout blocage, commande perdue ou ralentissement durable. Une pause au premier chargement doit être distinguée d’une baisse persistante de fluidité.
7. Mettre explicitement le combat en pause, changer d’application 20 secondes, revenir et reprendre. Vérifier ensuite le message de sauvegarde et recharger la page ; progression et ressources ne doivent pas être perdues ou dupliquées. Ne pas effacer les données du navigateur.

Avec un seul téléphone, la coopération à plusieurs reste non testée. Pour chaque anomalie, conserver l’heure, le pays, les gestes précis, le résultat attendu, le résultat réel et une courte vidéo si possible.

## Références techniques

- [Conditions d’installation et limites des navigateurs — MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Déclenchement de l’installation — web.dev](https://web.dev/articles/customize-install)
- [Installer une application Web sur Android — Google Chrome](https://support.google.com/chrome/answer/9658361?hl=fr&co=GENIE.Platform%3DAndroid)
