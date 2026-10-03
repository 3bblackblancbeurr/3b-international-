# Ville 3B — gomme, variantes et vie des équipements

## Retirer une construction

L’outil Supprimer reste compact et fonctionne par toucher puis validation. Bâtiments, routes, ponts, tunnels, rails, conduites, paysages, reliefs et objets exposés sont pris en charge. Lorsque plusieurs réseaux se superposent, une liste permet de choisir lequel retirer. Un aperçu rouge identifie le tracé. Une glissade déplace la caméra sans effacer.

Un bâtiment retiré du terrain reste dans la réserve, avec son chantier, sa variante et son achat. Un objet exposé revient dans l’inventaire. Les tracés sont retirés du plan enregistré. Annuler/Rétablir restaure l’action, sous comparaison du plan courant pour éviter d’écraser une autre session. Il n’y a ni remboursement ni nouvelle récompense. La mairie unique reste unique, même rangée.

## Variantes de bâtiments

Une graine persistante utilise la requête de construction existante ou l’identifiant d’une construction ancienne. Les modèles changent leurs volumes, proportions, toitures, ailes, vitrages, balcons, terrasses, clôtures et couleurs. Les maisons disposent de huit combinaisons de volumes et quatre traitements de toit, avec plusieurs façades, fenêtres et dimensions. Les institutions partagent le langage 3B mais reçoivent des profils distincts. La mairie conserve volontairement son modèle Matrice commun à toutes les villes.

Le catalogue attribue une variante avant le choix. Cette graine est utilisée pour l’aperçu de placement, la requête serveur et le modèle construit. Après achat, le prochain exemplaire reçoit une nouvelle graine. Déplacement, réserve, reprise et visite conservent le modèle. Aucun achat supplémentaire, aucune colonne SQL et aucune ressource externe ne sont introduits. Les variantes sont procédurales ; elles ne représentent pas un nombre illimité de modèles dessinés individuellement.

## Circulation et sports

Les voitures attendent aux carrefours de surface, alternent les feux avec une phase de dégagement, maintiennent un intervalle derrière leur véhicule précédent et forment des files. Les ponts et tunnels ne créent pas de faux carrefours avec les routes au sol. L’évolution utilise un pas plafonné ; la reprise après arrière-plan ne propulse pas les véhicules. Les budgets précédents sont conservés. Il s’agit de véhicules représentatifs, pas de chaque trajet de toute la population.

Football, basket, tennis, natation, gymnastique et arène possèdent des géométries d’équipements et des routines différentes. Des habitants sportifs et ballons apparaissent seulement avec population et équipement terminé desservi par route. Les animations sont plafonnées à dix sportifs sur téléphone, dix-huit sur ordinateur. Ma ville présente l’état des équipements. Cela anime les installations ; ce lot n’ajoute pas six mini-jeux directement contrôlables.

Les habitants à pied disposent également d’un mouvement de bras et jambes. La préférence de mouvement réduit reste respectée. Aucun niveau d’ombres, texture ou résolution supplémentaire n’est imposé.

## Vérification

Tests de choix entre réseaux superposés, retrait d’un seul élément, rejet d’une sélection devenue ancienne, objet exposé et annulation ; cinquante variantes de maison distinctes et stables ; mairie commune ; six équipements distincts ; feux, files et intervalle ; sports soumis à des équipements terminés, route et population. Compilation complète et CI obligatoires avant publication. Les parcours réels sur Samsung et entre deux sessions connectées nécessitent ces appareils et comptes et ne sont pas déclarés accomplis.
