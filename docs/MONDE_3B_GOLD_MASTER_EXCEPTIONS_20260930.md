# Monde 3B — exceptions visuelles précises du 30 septembre 2026

La vérification CI du commit `95d679a3243b4a71b779de098a7e2b3d245effc7` a réussi les 29 contrats Gold Master et le verrou de marque, puis refusé de nouveaux boutons HTML et styles contenant des couleurs, rayons ou ombres littéraux. Les six composants concernés du Monde utilisent maintenant le `Button` partagé. Les quatre feuilles de style Hub utilisent les tokens officiels, leurs variantes transparentes via `color-mix`, et les tokens de rayon et d’ombre existants. La couleur de retour à la Cité dans l’Atlas utilise le token champagne.

Le script de protection est conservé sans assouplissement. Les marqueurs `gold-master-allow` suivants portent uniquement sur des lignes identifiées par le diff de la PR ; ils ne dispensent aucun fichier complet du contrôle.

| Source | Lignes revues | Motif |
| --- | --- | --- |
| `hub/broken-circle-visuals.js` | Trois définitions de matériau | Pierre sombre, métal doré et reflets bleus de la couronne ; les couleurs THREE sont des valeurs de matériau et ne peuvent pas résoudre une variable CSS. |
| `hub/interior-visuals.js` | Quatre définitions de matériau | Pierre, métal, bois clair et végétation des salles ; teintes de surface adaptées à l’éclairage physique existant. |
| `hub/mission-effect-visuals.js` | Une définition de palette | Pierre, bois, végétation et accents des aménagements persistants, sans changer les commandes, preuves ou récompenses. |
| `premium-hub-visuals.js` | Une définition de matériau | Bordure dorée des quais, identique au métal déjà présent dans les bâtiments de main. |
| `scene.js` | Trois lignes | Teinte du véhicule de trajet, couleurs existantes pluie/neige dans l’actualisation météo, fond sombre d’une salle. Ce sont des matériaux ou un fond de rendu, sans style HTML. |
| `hub/services-state.js` | Quatre lignes | Valeurs par défaut des créations déjà persistées et couleurs d’un SVG autonome exportable. Les valeurs sont nécessaires à la normalisation/reprise, et le fichier exporté ne possède pas le contexte CSS de l’application. Les couleurs fournies par le joueur restent validées. |

Ces 16 lignes conservent leurs valeurs déjà utilisées dans le lot revu. Il ne s’agit pas d’une nouvelle palette pour l’interface. Aucun changement d’autorité, de sauvegarde, de droit Premium ou d’identité n’est associé à cette correction. Toute nouvelle couleur d’interface reste soumise aux tokens et au garde-fou global.

Validation locale de la correction : 76 tests ciblés réussis (contrats Gold Master, salles, parcours France et huit royaumes, graphismes, mobilité, services et replay) ; compilation des six composants réussie. Le script réel `verify-gold-master-diff.mjs` a également réussi sur une fixture Git isolée, reconstruite avec les sources de référence de main `4f121e0e` et les seize fichiers Monde corrigés. Cette preuve concerne le lot Monde ; la CI du prochain commit et les autres domaines sont vérifiés séparément par l’intégration.
