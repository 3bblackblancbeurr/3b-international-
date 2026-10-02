# Présenter et vérifier le Passeport 3B

L’espace de vérification est placé sous la carte existante. La carte, son identité visuelle et ses paramètres d’apparence ne sont pas modifiés.

1. **Présentation ponctuelle** : le membre authentifié génère un QR contenant uniquement un ticket opaque. Le serveur émet un ticket à usage unique, valable cinq minutes. Une nouvelle émission annule les anciens tickets ; la révocation est explicite et confirmée par le serveur. Le lecteur consulte un profil public et un niveau de confiance, sans confondre badge public et identité civile.
2. **Identité civile** : le statut provient du profil serveur. Le bouton de contrôle externe exige un parcours prestataire configuré, approuvé et en production, ainsi que des informations d’identité complètes. Avant le démarrage, une case indépendante demande l’autorisation d’envoyer les nom, prénom et date de naissance au prestataire IDnow pour ce contrôle ; elle est initialement décochée et réinitialisée au changement de compte. Aucun parcours local ni environnement de test ne permet d’annoncer une identité vérifiée.
3. **Attestation partenaire** : le registre retourne uniquement les partenaires actifs. Le membre sélectionne un destinataire, coche les informations acceptées, colle le code de demande fourni par ce partenaire puis donne son consentement. Le serveur émet la preuve signée. Le partenaire contrôle sa signature, son audience, son code de demande et son état serveur ; la copie du QR seul ne démontre pas la possession.

Les quatre informations disponibles sont `passport.basic`, `identity.verified`, `profile.public` et `access.entitlements`. L’option d’identité vérifiée reste indisponible sans confirmation externe. Les droits civils, l’âge et le statut créateur ne sont pas déduits d’informations déclaratives.

Un registre vide indique « Aucun partenaire actif enregistré ». Une panne indique une disponibilité inconnue. Aucune donnée d’exemple, signature locale ou attestation de secours n’est présentée. Les erreurs d’authentification demandent une reconnexion ; le changement de compte invalide les réponses en cours et masque les preuves précédentes.

Les tickets, liens prestataire et jetons signés restent en mémoire de la page. Ils sont supprimés du composant à l’expiration ou à la déconnexion. Le navigateur télécharge une attestation JSON uniquement à la demande du membre ; l’historique serveur ne restitue pas son jeton. L’indication « émise » ne remplace pas une vérification cryptographique et une vérification de révocation côté partenaire.

L’acceptation externe dépend de l’accord du destinataire avec 3B. Le Passeport 3B demeure une identité numérique privée.
