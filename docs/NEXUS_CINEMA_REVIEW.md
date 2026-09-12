# Revue des captures réelles — Nexus cinéma

## Première intégration vérifiée
Le workflow `34723230811` a terminé avec succès l'import des images, `npm test`, `npm run build`, le parcours navigateur historique et le nouveau parcours cinéma. Les captures sont de vrais rendus Chromium des composants et de l'application, pas des générations d'images. L'archive porte l'identifiant `10307440217`.

Le second contrôle de PR a également validé le parcours cinéma et les cinq tailles. Son test historique a rencontré une course temporelle dans le helper : l'introduction s'était terminée automatiquement pendant l'attente du clic sur « Passer ». La navigation avait bien atteint le Nexus, sans erreur navigateur. Le helper attend désormais ce même état final dans ce cas précis ; le clic réel sur « Passer » reste testé séparément avec l'introduction en pause, donc sans disparition automatique de la commande.

## Corrections après inspection visuelle
- Les étiquettes ajoutées sur les portes ne masquent plus les intitulés du visuel. Elles apparaissent seulement au survol/focus, près du bas du seuil. Les boutons conservent tous un nom accessible et la galerie affiche les noms en vrai texte.
- Le fond secondaire est flouté et assombri pour éviter les doublons de texte derrière le contenu. Le décor principal reste net.
- Le nom du gardien est replacé dans le flux normal pour ne pas chevaucher les descriptions sur petit écran.
- Les cibles de porte font au moins 44 px ; le bouton de fermeture reste disponible pendant le défilement.
- Les commandes Passer/Pause restent au même endroit pendant les changements de texte du tunnel.
- Les captures de la boîte modale utilisent le viewport réel, sans ajouter la page inactive située derrière.

## Périmètre des preuves
Le workflow de PR suivant doit revalider ces finitions, les cibles tactiles et l'absence de chevauchement. Les rapports sont déposés dans `artifacts/nexus/` et `artifacts/nexus-cinema/`. Les captures mobiles simulent la taille d'écran ; aucun Samsung physique ni compte utilisateur connecté réel n'a été testé.

La publication Vercel est une étape distincte : le contrôle associé à `b682c4e5febaeb30cfa2842c83a100e5004dd4ea` indiquait encore `Deployment rate limited — retry in 24 hours.` Aucun abonnement payant n'a été activé.
