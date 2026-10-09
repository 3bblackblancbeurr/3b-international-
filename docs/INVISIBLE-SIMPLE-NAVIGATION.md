# Une navigation simple pour une aventure à déchiffrer

L’ancien écran réunissait l’accueil, l’énigme, la carte, le journal, les Gardiens, les huit royaumes, la finale et les deux missions collectives. Sur téléphone, trouver la prochaine action demandait de parcourir une longue page. Le menu général ajoutait un décor 3D et plusieurs annuaires de destinations.

Le Monde Invisible possède maintenant quatre vues : **Aventure**, **Royaumes**, **Journal** et **Missions**. Une seule est rendue à la fois. L’Aventure affiche uniquement l’étape actuelle : invitation, question, coffre, portail, royaume suivant ou finale. Une réponse correcte fait apparaître la prochaine étape sans navigation verticale entre plusieurs panneaux. La carte, le Gardien, l’aide et les réglages s’ouvrent à la demande.

Les questions, leurs réponses acceptées, la progression et les règles de récompense restent celles de la campagne. Les trois propositions de réponses ont été retirées de l’interface ; un indice reste accessible par une action volontaire. La carte et l’inspection 3D ne changent pas la question courante et ne révèlent pas automatiquement son indice.

Le menu général utilise les mêmes destinations sur téléphone et ordinateur : quatre accès principaux, des catégories courtes et une recherche. Une seule catégorie est affichée. Les accès privés viennent toujours des permissions et des destinations fournies par l’application. Les espaces en préparation restent clairement signalés. Les réglages et l’installation se consultent à la demande.

Les vues secondaires utilisent le paramètre `invisibleView` avec quatre valeurs autorisées. Retour, Suivant et rechargement retrouvent la vue ; quitter le Monde Invisible retire ce paramètre des liens globaux. Changer de vue conserve la réponse en cours. Sur Android, Retour ferme d’abord les fenêtres natives ou les panneaux partagés avant de quitter la page.

Les missions collectives et saisonnières utilisent deux onglets, avec un seul service monté à la fois. Les réponses en cours sont conservées entre ces deux onglets. Les huit affinités sont présentées dans une liste compacte ; les contributions et les accomplissements restent confirmés par le serveur.

La vérification navigateur couvre le parcours complet, les vues, les retours, les fenêtres, la saisie conservée, les services ouverts à la demande, le menu, le focus et la hauteur réelle du contenu sur ordinateur et téléphone. Elle utilise des états joueurs et une caméra synthétiques. Elle ne modifie aucun compte réel et ne démontre pas un placement WebXR physique.
