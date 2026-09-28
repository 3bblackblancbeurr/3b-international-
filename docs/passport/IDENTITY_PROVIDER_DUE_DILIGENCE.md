# Passeport 3B — Questionnaire fournisseur d'identité

Date de modèle : 28 septembre 2026  
Statut : modèle de due diligence. À remplir avec chaque prestataire candidat avant activation.

## Informations du prestataire

- Société :
- Service exact / version :
- Contact commercial :
- Contact sécurité :
- Contact DPO / vie privée :
- URL documentation :
- Environnement sandbox :
- Environnement production :

## Certification / niveau de garantie

- Statut PVID actuel :
- Niveau : substantiel / élevé / autre :
- Référence de certificat :
- Date de début :
- Date d'expiration :
- Périmètre exact couvert par le certificat :
- Preuve officielle vérifiée le :
- Lien ANSSI / décision :

Ne jamais considérer la société entière comme « certifiée PVID » si seul un service précis est certifié.

## Documents et contrôles

- CNI française :
- Passeport français :
- Titres étrangers :
- Contrôle authenticité documentaire :
- Contrôle expiration :
- Lecture NFC :
- Liveness :
- Face match document/personne :
- Revue manuelle :
- Gestion des faux positifs / faux négatifs :
- Procédure d'appel après rejet :

## Sécurité d'intégration

- API serveur-à-serveur :
- Authentification API :
- Signature webhook :
- Algorithme de signature :
- Protection anti-rejeu :
- Timestamp webhook :
- Idempotency key :
- Rotation des secrets :
- Rotation des clés :
- IP allowlist disponible :
- Sandbox avec scénarios fraude/rejet :
- SLA :
- Notification incident :

## Vie privée / RGPD

- Responsable / sous-traitant :
- DPA disponible :
- Hébergement :
- Sous-traitants :
- Transferts hors EEE :
- SCC / mécanisme de transfert :
- Durée de conservation document :
- Durée de conservation selfie/vidéo :
- Suppression anticipée :
- Export / droit d'accès :
- Politique mineurs :
- DPIA fournie ou assistance DPIA :
- Données biométriques traitées :
- Base juridique proposée :

## Données retournées à 3B

3B vise une sortie minimale. Cocher ce que le prestataire peut retourner sans transmettre le document brut :

- résultat vérifié/rejeté :
- niveau de confiance :
- nom vérifié :
- prénom(s) vérifié(s) :
- date de naissance vérifiée :
- majorité oui/non :
- nationalité/pays vérifié :
- type de document :
- référence de dossier pseudonymisable :
- horodatage :
- code de rejet borné :
- preuve/audit exportable :

## Exigences 3B non négociables

Le candidat doit accepter que :

- le navigateur ne puisse jamais rendre lui-même une identité `verified` ;
- le webhook soit vérifié côté serveur ;
- chaque événement soit idempotent ;
- une référence fournisseur ne puisse pas être liée à deux comptes 3B ;
- les références externes soient pseudonymisées/hachées lorsque possible ;
- 3B ne stocke pas par défaut scan CNI, selfie, vidéo de liveness ou gabarit biométrique ;
- une identité rejetée/expirée/révoquée ne conserve pas le statut vérifié ;
- les incidents puissent entraîner suspension/révocation rapide ;
- la sandbox permette des tests de rejeu, doublon, expiration et révocation.

## Tests avant activation

- création tentative :
- abandon :
- succès :
- rejet :
- document expiré :
- webhook invalide :
- webhook rejoué :
- webhook en double :
- mauvais utilisateur :
- référence déjà liée :
- expiration :
- révocation :
- suppression du compte :
- récupération après perte téléphone :
- Android réel :
- iOS réel :
- web desktop :
- réseau faible / reprise :

## Décision interne

- Prestataire retenu : oui / non / en étude
- Motif factuel :
- Risques ouverts :
- Validation juridique :
- Validation sécurité :
- Validation vie privée :
- Validation technique :
- Date de prochaine revue :

## Source officielle à revérifier

Au moment de chaque décision, vérifier le référentiel PVID en vigueur et le statut du **service exact** sur le site de l'ANSSI. Une certification expirée ou portant sur une autre version du service ne doit pas être considérée comme valide.
