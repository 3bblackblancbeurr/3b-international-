// Pédagogie de nutrition 3B : fonctions physiologiques documentées,
// jamais diagnostics, thérapies ou promesses de résultat d'un aliment isolé.
export const NUTRIENT_ROLES = {
  'Glucides': {
    role: 'Les glucides apportent de l’énergie. Leur qualité dépend notamment de la matrice alimentaire et des fibres.',
    source: 'https://www.anses.fr/fr/content/les-glucides'
  },
  'dont sucres': {
    role: 'Les sucres indiqués sont les sucres naturellement présents ou ajoutés selon le produit. Un fruit entier contient aussi de l’eau et des fibres.',
    source: 'https://www.mangerbouger.fr/'
  },
  'Protéines': {
    role: 'Les protéines contribuent au maintien des muscles et au renouvellement de nombreux tissus. La diversité alimentaire compte.',
    source: 'https://www.anses.fr/fr/content/les-proteines'
  },
  'Fibres': {
    role: 'Les fibres participent au transit intestinal et à la variété du microbiote. Augmente progressivement les quantités selon ta tolérance.',
    source: 'https://www.mangerbouger.fr/'
  },
  'Matières grasses': {
    role: 'Les lipides participent au fonctionnement des cellules et à l’absorption de certaines vitamines. Le type de matières grasses compte davantage qu’un seul chiffre.',
    source: 'https://www.anses.fr/fr/content/les-lipides'
  },
  'Vitamine A': {
    role: 'La vitamine A est importante pour la rétine, la vision dans la pénombre et le maintien normal des tissus. Les caroténoïdes alimentaires peuvent en être des précurseurs.',
    source: 'https://ods.od.nih.gov/factsheets/VitaminA-Consumer/'
  },
  'Vitamine C': {
    role: 'La vitamine C contribue à la synthèse du collagène, au fonctionnement normal des défenses et à l’absorption du fer non héminique. Elle ne traite pas une maladie.',
    source: 'https://ods.od.nih.gov/factsheets/VitaminC-Consumer/'
  },
  'Vitamine B9': {
    role: 'Les folates (vitamine B9) participent à la division cellulaire et à la formation des cellules sanguines. En cas de projet de grossesse, demander conseil sur les besoins spécifiques.',
    source: 'https://ods.od.nih.gov/factsheets/Folate-Consumer/'
  },
  'Vitamine E': {
    role: 'La vitamine E participe à la protection des cellules contre le stress oxydatif. Les compléments ne remplacent pas une alimentation équilibrée.',
    source: 'https://ods.od.nih.gov/factsheets/VitaminE-Consumer/'
  },
  'Vitamine K': {
    role: 'La vitamine K contribue à la coagulation normale et à la santé osseuse. Sous traitement antivitamine K, conserver des apports réguliers et demander un conseil médical.',
    source: 'https://ods.od.nih.gov/factsheets/VitaminK-Consumer/'
  },
  'Potassium': {
    role: 'Le potassium contribue au fonctionnement des muscles et des nerfs et à la régulation de la pression artérielle. En cas de maladie rénale, l’apport doit parfois être adapté.',
    source: 'https://ods.od.nih.gov/factsheets/Potassium-Consumer/'
  },
  'Calcium': {
    role: 'Le calcium contribue à la structure des os et des dents et au fonctionnement musculaire. Son absorption varie selon les aliments.',
    source: 'https://ods.od.nih.gov/factsheets/Calcium-Consumer/'
  },
  'Fer': {
    role: 'Le fer est nécessaire à l’hémoglobine, qui transporte l’oxygène dans le sang. Le fer végétal n’est pas absorbé aussi facilement que le fer de certaines sources animales.',
    source: 'https://ods.od.nih.gov/factsheets/Iron-Consumer/'
  },
  'Magnésium': {
    role: 'Le magnésium intervient dans les fonctions musculaires et nerveuses, entre autres. Ce n’est pas un traitement anti-stress par lui-même.',
    source: 'https://ods.od.nih.gov/factsheets/Magnesium-Consumer/'
  }
};
export function explainNutrient(label) {
  if (typeof label !== 'string' || !label) return null;
  if (NUTRIENT_ROLES[label]) return NUTRIENT_ROLES[label];
  const alias = Object.keys(NUTRIENT_ROLES).find(key => label.toLocaleLowerCase('fr').startsWith(key.toLocaleLowerCase('fr')));
  return alias ? NUTRIENT_ROLES[alias] : null;
}
