# Santé 3B — outils et connexions, 15 octobre 2026

## Disponibilité

| Fonction | Web / PWA | Nouvelle application native |
| --- | --- | --- |
| Mobilité, 3 séances illustrées, minuteur, étapes, pause | Oui | Oui |
| Routines au réveil / avant le repos et énergie ressentie | Oui | Oui |
| Historique 7 / 30 / 90 jours, export et suppression | Oui | Oui |
| Rappels | Fichier calendrier, import volontaire, 30 occurrences | Notifications locales facultatives |
| Pas automatiques du téléphone | Pas système indisponibles ; aucune saisie manuelle ni estimation affichée | Health Connect ou HealthKit, lecture seule après autorisation, rafraîchissement automatique quand Santé est visible |

La livraison web ne met pas à jour le binaire mobile. La distribution Android/iOS nécessite une version native nouvellement construite et installée. Les essais physiques et la signature de distribution ne sont pas remplacés par les tests de contrats, les simulations du pont JavaScript ou une compilation de simulateur.

## Données et fiabilité

- La clé de journal v1 est conservée. Les anciens champs de pas manuels/estimés sont normalisés à `null` et ne participent plus à aucun total.
- La sauvegarde locale reste volontaire. Sans consentement de sauvegarde, les données du journal restent en mémoire pendant la visite.
- Les jours sans mesure restent absents ; zéro est une mesure valide. Les pas de différentes sources ne sont jamais additionnés.
- Les pas importés sont un instantané des 30 derniers jours calendaires locaux ; le journal personnel couvre jusqu’à 90 jours. Une lecture complète remplace l’ancien instantané importé. Un échec conserve la dernière lecture et sa date visible.
- Une déconnexion invalide les lectures en cours et efface les imports 3B. Android retire la permission de lecture ; sur iOS, l’utilisateur retire lui-même l’autorisation dans Santé. Les données sources du téléphone restent intactes.
- Aucun serveur santé, suivi en arrière-plan ni télémétrie de cette rubrique. Les journaux des ponts Capacitor sont désactivés.
- Les rappels natifs ont un texte générique. Android emploie une fenêtre de livraison inexacte de dix minutes, soumise aux restrictions du système. Les calendriers exportés sont gérés séparément.
- La mobilité enregistre uniquement le temps actif du minuteur après confirmation. Ce n’est pas une mesure d’effort ni une détection automatique d’exercice.

## Vérifications

Voir `VALIDATION.md` pour les résultats et commandes. Les parcours de refus, de fermeture pendant une demande de permission et de déconnexion pendant une lecture sont couverts par des simulations contrôlées du pont natif dans le navigateur. Elles n’ont aucun effet sur le code de production.
