L’application permettait d’activer un passeport avec des champs vides, ne conservait pas la rubrique lors d’un rechargement et ne proposait pas de panier. L’espace IA et le Tome 0 nécessitaient également les mises à jour demandées.

Cette PR reprend la boutique avec un catalogue vide et un panier persistant, prépare Stripe Checkout et la confirmation des commandes, corrige le parcours membre et ajoute les deux cases « IA textile » et « Mode 3 IA ». Elle présente le Tome 0 « Le Cercle Brisé », améliore la navigation et la lisibilité mobile, et connecte les réglages d’affichage à leurs effets.

La page « De zéro à l’international », BLACK • BLANC • BEUR, le visuel du Passeport 3B et les clés de stockage existantes sont conservés. Le catalogue sera alimenté depuis Stripe ; aucun vêtement, prix ou paiement fictif n’est publié.

Validation : build de production réussi, 32 tests réussis, rendu statique des 16 routes et contrôle de la différence Git réussis. Le navigateur de vérification bloque l’aperçu local : la recette visuelle et interactive, dont le mobile, reste à effectuer. Les tests de paiement utilisent des doubles ; la recette complète Stripe en mode test reste à effectuer.

Les services IA, l’authentification serveur et l’ouverture des ventes restent à configurer. Cette PR est proposée en brouillon pour permettre la revue et les vérifications restantes. Fusion et mise en production uniquement après validation.
