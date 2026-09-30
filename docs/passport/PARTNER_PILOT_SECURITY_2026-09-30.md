# Passeport 3B : pilote partenaires et confirmation par clés d’accès

30 septembre 2026. Implémentation locale à relire et à qualifier. Les deux nouvelles migrations sont **PENDING**. Aucun déploiement, partenaire contacté ou certification obtenue dans ce travail.

## Comportement livré

Le pilote en ligne transmet exclusivement deux informations optionnelles : `passport_active` et `identity_verified`. Chaque partenaire possède un identifiant, une audience HTTPS fixe, un secret aléatoire de 256 bits dont seul le SHA-256 est conservé, des scopes autorisés et une finalité relue. Il reste désactivé tant que la revue n’est pas enregistrée. Le secret du partenaire et le secret de pseudonymisation restent sur les serveurs ; jamais dans le navigateur.

Le partenaire crée une demande avec une nonce fraîche, aléatoire, d’au moins 32 caractères URL-safe. La nonce est unique pour ce partenaire. Le service retourne un lien `/?page=passport&passport_request=<64 caractères hexadécimaux>`, valable trois minutes. Ce lien contient un jeton opaque, pas des données civiles. La base conserve son hash. Le détenteur du lien ne peut pas récupérer de preuve sans le secret du partenaire, l’audience et la nonce exactes.

Le membre connecté voit le nom du partenaire, sa finalité, l’audience, les informations demandées et l’expiration. Il doit cocher son accord puis confirmer avec une clé d’accès. Cette confirmation est liée à son utilisateur, sa session et au hash de cette demande, valable une minute et consommée une seule fois. Refuser ferme aussi la demande côté serveur. Aucun accord automatique après connexion.

La récupération de la preuve est atomique : un seul appel peut réussir. Elle recontrôle l’activité du Passeport, le partenaire, ses scopes, l’audience, la nonce, l’expiration et la révocation du consentement. L’identité vérifiée exige une preuve IDnow du nouveau parcours, production/live, un résultat lié et accepté, de moins de 365 jours. Les anciennes preuves n’ont pas ce marqueur et ne suffisent pas. Les preuves périmées peuvent être renouvelées ; un dossier révoqué nécessite une intervention de support.

Le sujet transmis est différent pour chaque partenaire, dérivé par HMAC-SHA256 d’un secret serveur distinct. Aucun UUID de compte, identifiant public du Passeport, nom civil, date de naissance, pays, e-mail, badge de fondateur, XP, Coins ou inventaire n’est transmis. `age.over18`, profil public, statut créateur et droits commerciaux restent fermés : une date déclarée ou un badge public ne constitue pas une attestation de ces informations.

La réponse est une vérification **en ligne** par HTTPS à destination d’un serveur partenaire authentifié. Elle n’est pas une pièce justificative signée, un JWT de connexion, un document réutilisable hors ligne ou une implémentation OIDC/OpenID4VP. Le partenaire doit la rattacher à sa transaction locale, vérifier audience/nonce/expiration, puis la consommer une fois. Une révocation ne peut pas effacer un résultat que le partenaire a déjà lu ; le contrat doit fixer sa rétention et exiger une nouvelle vérification pour une nouvelle action.

## Passkeys : périmètre exact

`passport-passkeys` fournit l’enrôlement, la vérification cryptographique, la liste et la révocation des clés. Elles confirment les consentements et les changements de clés **dans une session Supabase déjà connectée**. La connexion initiale et le renouvellement des sessions restent Supabase Auth. Aucune connexion sans mot de passe n’est revendiquée.

Les défis expirent après trois minutes et sont consommés avant vérification. Origine HTTPS et RP ID sont fixes et vérifiés, `userVerification` est obligatoire ; cérémonies intégrées à une autre origine refusées. Le user handle est aléatoire et opaque. Le serveur vérifie aussi son association au compte lorsque l’authentificateur le renvoie. Les clés privées, codes PIN et données biométriques restent dans l’authentificateur. La base garde uniquement clé publique, identifiant, compteur et métadonnées de gestion.

Le compteur est mis à jour sous verrou avec comparaison de l’ancienne valeur. Les authentificateurs synchronisés qui retournent toujours zéro restent acceptés, avec les protections de défi et de preuve à usage unique. L’ajout d’une clé exige une clé existante ; pour la toute première clé, une session créée depuis moins de dix minutes. Une session fraîche compromise avant le premier enrôlement reste une limite de ce modèle : cette étape ne constitue pas une vérification civile.

La révocation d’une clé invalide ses preuves courtes. La déconnexion des autres appareils vérifie le succès Supabase et fonctionne même lorsque le flag passkeys est fermé. La récupération par clé de secours révoque toutes les anciennes clés, preuves, demandes partenaires, consentements et vérifications IDnow en cours ; elle refuse d’annoncer un succès si une révocation échoue et restaure la clé de secours précédente pour permettre de réessayer. Le changement de mot de passe par e-mail vérifie désormais les erreurs de déconnexion des autres sessions ; il ne révoque pas automatiquement les passkeys. La perte de toutes les passkeys nécessite la clé de secours ou une procédure de support à définir.

## IDnow : corrections de fiabilité

La réservation d’une tentative et le passage `pending` sont atomiques avant l’appel au prestataire. Deux onglets ne peuvent pas lancer deux demandes concurrentes pour le même compte. Liaison et finalisation sont des fonctions service-only sous verrou. Une tentative terminée ne régresse pas, une ancienne tentative ne remplace pas une nouvelle et un webhook ne réactive pas un Passeport suspendu ou une identité révoquée. Les erreurs et flux non approuvés libèrent `pending`, intégrant la correction de PR390.

Le JWT webhook exige signature, issuer, audience, subject, expiration et date d’émission. Son subject doit correspondre à l’événement ; environnement, flux et statut sont liés. Un événement terminal arrivé avant la liaison de la session reste réessayable. Le résultat complet confirme `sessionId`, `flowId`, sujet opaque, environnement, statut `COMPLETED` et résultat définitif. Un succès sandbox/staging ne vérifie jamais une identité civile. `NO_OUTCOME` et les schémas incohérents sont refusés. Aucun document, selfie ou datablock brut n’est ajouté à la base. Ces contrôles suivent les interfaces officielles [webhooks](https://docs.eu.platform.idnow.io/docs/integration/webhooks-events/) et [résultats de session](https://docs.eu.platform.idnow.io/docs/integration/get-session-results/).

## Frontières et preuves de contrôle

Toutes les nouvelles tables utilisent RLS, une politique restrictive de refus navigateur et des permissions service-only. Toutes les nouvelles fonctions, y compris les helpers internes, refusent `PUBLIC`, `anon` et `authenticated`. La session est vérifiée par Supabase puis contrôlée dans `auth.sessions`. Un bearer signé mais dont la session a été révoquée échoue.

Les tests Node exécutent les migrations et fonctions dans PostgreSQL/PGlite, avec comptes exclusivement synthétiques : permissions réelles, réservations, expirations, preuves historiques, renouvellement, revocations, nonce/audience/scopes, session, consommation, compteurs et récupération. Les tests Deno exercent les handlers réels avec réseau simulé et un authentificateur logiciel signé : clé publique COSE, signature P-256, refus d’une origine, challenge, RP hash, UV ou compteur incorrect, et signature forgée. Aucune donnée utilisateur ou clé de production n’est utilisée.

Ces tests ne remplacent pas une recette sur appareils réels, un audit externe, une revue juridique, ni une qualification IDnow contractuelle. La protection du consentement suppose également que le code web servi par le domaine 3B est digne de confiance ; une passkey ne signe pas à elle seule le texte affiché à l’utilisateur.

## Sources de conception consultées le 30 septembre 2026

- [WebAuthn niveau 3, recommandation W3C du 25 août 2026](https://www.w3.org/TR/webauthn-3/) : origine/RP ID, vérification locale, user handle opaque et contrôles du serveur. L’usage de cette API n’est pas une certification FIDO du produit 3B.
- [SimpleWebAuthn serveur 14.0.x](https://simplewebauthn.dev/docs/packages/server) : bibliothèque de vérification fixée à 14.0.3. Documentation runtime Node 22+ ou Deno 2.4+. Vérifiée localement sous Deno 2.9.6 ; activation hébergée encore conditionnée au runtime réellement disponible.
- [OpenID4VP 1.0 final](https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html) : destination et nonce fraîche sont des principes repris dans le pilote. L’implémentation complète des formats, du protocole et de la confiance interopérable reste une étape distincte.
