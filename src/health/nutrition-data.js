// Atlas Nutrition 3B — valeurs indicatives / 100 g de partie comestible.
// Sources : Anses Ciqual 2025, codes d'aliments précisés pour chaque fiche.
// Les valeurs moyennes varient selon variété, maturité et cuisson. Jamais de
// nutriment inventé pour les aliments qui ne sont pas encore documentés.
export const NUTRITION_SOURCES = {
  ciqual: {
    name: 'Anses. 2025. Table de composition nutritionnelle des aliments Ciqual',
    url: 'https://doi.org/10.57745/RDMHWY'
  },
  vitaminA: { name: 'NIH · Vitamine A et vision', url: 'https://ods.od.nih.gov/factsheets/VitaminA-Consumer/' },
  vitaminC: { name: 'NIH · Vitamine C et collagène', url: 'https://ods.od.nih.gov/factsheets/VitaminC-Consumer/' },
  potassium: { name: 'NIH · Potassium', url: 'https://ods.od.nih.gov/factsheets/Potassium-Consumer/' },
  fiber: { name: 'Santé publique France · Fruits et légumes', url: 'https://www.mangerbouger.fr/manger-mieux/a-tout-age-et-a-chaque-etape-de-la-vie/les-recommandations-alimentaires-pour-les-adultes/augmenter/augmenter-les-fruits-et-legumes' },
  eyes: { name: 'National Eye Institute · Pigments et vision', url: 'https://www.nei.nih.gov/eye-health-information/clinical-trials/age-related-eye-disease-studies-aredsareds2/aredsareds2-frequently-asked-questions' },
  heart: { name: 'NHLBI · Alimentation et santé du cœur', url: 'https://www.nhlbi.nih.gov/health/heart-healthy-living/healthy-foods' }
};

export const ORGAN_TOPICS = [
  { id: 'all', label: 'Tout explorer', detail: 'Un aliment complet se comprend par ses nutriments, pas par une promesse miracle.' },
  { id: 'eyes', label: 'Yeux', detail: 'La vitamine A est utile au fonctionnement de la rétine. La lutéine et la zéaxanthine sont des pigments présents dans certains végétaux verts. Aucun aliment ne corrige la myopie.' },
  { id: 'skin', label: 'Peau', detail: 'La vitamine C participe à la synthèse du collagène ; la vitamine A est impliquée dans le maintien des tissus. L’alimentation ne remplace pas la protection solaire.' },
  { id: 'heart', label: 'Cœur', detail: 'Fibres et aliments riches en potassium peuvent contribuer à une alimentation favorable à la santé cardiovasculaire. Cela ne soigne pas une maladie du cœur.' },
  { id: 'circulation', label: 'Circulation', detail: 'La qualité globale de l’alimentation compte pour la pression artérielle et les vaisseaux. Un légume ne « débouche » pas les artères.' },
  { id: 'digestion', label: 'Digestion', detail: 'Les fibres participent au transit. Les augmenter progressivement aide à limiter les inconforts digestifs.' },
  { id: 'defenses', label: 'Défenses', detail: 'La vitamine C contribue au fonctionnement normal du système immunitaire. Aucun fruit ne prévient ou ne guérit à lui seul une infection.' },
  { id: 'bones', label: 'Os', detail: 'La vitamine K, le calcium et d’autres nutriments participent à la santé osseuse. Une alimentation variée est nécessaire.' },
  { id: 'liver', label: 'Foie', detail: 'Le foie assure naturellement ses fonctions de transformation et d’élimination. Aucun fruit, jus ou aliment ne le « détoxifie ». Une alimentation équilibrée et la limitation de l’alcool restent les meilleurs repères.' }
];

const nutrient = (label, value, unit) => ({ label, value, unit });
const make = (name, code, values, micro, organs, highlights = []) => ({
  preparation: name,
  ciqualCode: code,
  values,
  micronutrients: micro.map(([label, value, unit]) => nutrient(label, value, unit)),
  organs,
  highlights
});
const k = (potassium, c, folates) => [
  ...(potassium === null ? [] : [['Potassium',potassium,'mg']]),
  ...(c === null ? [] : [['Vitamine C',c,'mg']]),
  ...(folates === null ? [] : [['Vitamine B9',folates,'µg']])
];
// Valeurs issues de fiches publiées avec identifiant Ciqual.
// Les états d'aliments sont explicites : un légume cuit n'est jamais présenté comme cru.
// null = donnée non utilisée/non vérifiée, et non 0.
export const FOOD_NUTRITION = {
  pomme: make('Pomme, chair crue, sans peau', '13396', { kcal:51, protein:0.3, carbs:11.9, sugars:11.4, fats:0.2, fiber:2.4 }, k(109,2,7), ['digestion','heart'], ['Fibres du fruit entier']),
  poire: make('Poire, chair crue', '13397', { kcal:50, protein:0.3, carbs:11.4, sugars:9.4, fats:null, fiber:3.1 }, k(110,2,16), ['digestion'], ['Fibres']),
  fraise: make('Fraise, crue', '13014', { kcal:35, protein:0.6, carbs:6, sugars:5.6, fats:null, fiber:3.8 }, k(140,54,99), ['skin','defenses','digestion'], ['Vitamine C', 'Folates (B9)']),
  abricot: make('Abricot, frais, dénoyauté', '13000', { kcal:44, protein:0.8, carbs:9, sugars:6.7, fats:null, fiber:1.7 }, k(260,3,8), ['eyes','digestion'], ['Caroténoïdes : quantité non chiffrée dans cette fiche']),
  prune: make('Prune, fraîche, dénoyautée', '13100', { kcal:52, protein:0.7, carbs:9.9, sugars:9.9, fats:0.3, fiber:1.4 }, k(157,10,5), ['digestion'], ['Fibres du fruit entier']),
  kiwi: make('Kiwi, pulpe crue', '13021', { kcal:61, protein:0.9, carbs:11, sugars:8.9, fats:0.6, fiber:2.4 }, k(290,82,22), ['skin','defenses','digestion'], ['Vitamine C', 'Fibres']),
  peche: make('Pêche, chair sans peau, sans noyau, crue (moyenne)', '13398', { kcal:44, protein:0.7, carbs:9.7, sugars:7.7, fats:null, fiber:1 }, k(184,4,12), ['digestion'], ['Fibres du fruit entier']),
  raisin: make('Raisin, cru', '13395', { kcal:71, protein:0.7, carbs:16.3, sugars:15.4, fats:0.3, fiber:1.1 }, k(193,3,15), ['digestion'], ['Fruit entier plutôt que jus']),
  carotte: make('Carotte, cuite sans matière grasse', '20353', { kcal:33, protein:0.4, carbs:6.2, sugars:5.7, fats:0.2, fiber:3.4 }, [...k(172,1,19),['Vitamine A (équivalent rétinol)',731,'µg']], ['eyes','skin','digestion'], ['Bêta-carotène : précurseur de vitamine A, quantité non chiffrée ici']),
  courgette: make('Courgette, chair et peau, crue', '20020', { kcal:17, protein:1.2, carbs:1.8, sugars:1.7, fats:0.3, fiber:1 }, k(261,18,24), ['skin','defenses','digestion'], ['Vitamine C']),
  tomate: make('Tomate ronde, crue', '20276', { kcal:18, protein:0.5, carbs:3.4, sugars:3, fats:null, fiber:1 }, k(210,19.9,null), ['skin','defenses'], ['Vitamine C', 'Lycopène : teneur non chiffrée dans cette fiche']),
  brocoli: make('Brocoli, cru', '20057', { kcal:32, protein:2.9, carbs:2.2, sugars:1.7, fats:0.4, fiber:2.6 }, [...k(321,91,67),['Calcium',48,'mg']], ['defenses','skin','heart','digestion','bones'], ['Vitamine C', 'Folates (B9)']),
  concombre: make('Concombre avec peau, cru', '20019', { kcal:17, protein:0.7, carbs:2.9, sugars:1.7, fats:0.1, fiber:0.5 }, k(157,3,7), ['digestion'], ['Un aliment riche en eau, sans remplacer l’hydratation']),
  epinard: make('Épinard, cuit', '20027', { kcal:20, protein:3.2, carbs:0.3, sugars:null, fats:0.1, fiber:2.7 }, [...k(396,2,125),['Calcium',140,'mg'], ['Fer',2.1,'mg'],['Magnésium',54,'mg']], ['eyes','bones','heart','circulation','digestion'], ['Lutéine et zéaxanthine : teneurs non chiffrées ici', 'Folates (B9)']),
  poireau: make('Poireau, cru', '20039', { kcal:30, protein:1.5, carbs:4.6, sugars:3.9, fats:0.3, fiber:1.8 }, k(180,12,64), ['digestion','defenses'], ['Fibres', 'Folates (B9)']),
  betterave: make('Betterave, cuite', '20003', { kcal:42, protein:1.4, carbs:7.1, sugars:6.7, fats:0.4, fiber:2.5 }, k(320,null,12), ['heart','circulation','digestion'], ['Fibres', 'Potassium']),
  'chou-fleur': make('Chou-fleur, cru', '20016', { kcal:25, protein:1.8, carbs:2.1, sugars:1.7, fats:0.7, fiber:2.2 }, k(270,48,56), ['skin','defenses','digestion'], ['Vitamine C']),
  courge: make('Courge butternut, chair sans peau, cuite', '20292', { kcal:29, protein:1.1, carbs:5.2, sugars:4, fats:null, fiber:1.8 }, k(340,2,31), ['eyes','digestion'], ['Caroténoïdes : quantité non chiffrée'])
};

// Nutritional links should never be mistaken for a cure.
// These descriptions explain plausible *roles of nutrients*, not measured medical outcomes.
export const FOOD_INSIGHTS = {
  carotte: {
    eyes: 'Son bêta-carotène peut devenir de la vitamine A, nécessaire au fonctionnement normal de la rétine et à la vision quand la lumière baisse. Cela n’améliore pas une vue déjà normale.',
    skin: 'La vitamine A intervient dans le maintien normal de la peau. Manger des carottes ne remplace ni un soin dermatologique ni une protection solaire.',
    digestion: 'Ses fibres contribuent à l’apport quotidien en fibres et au transit.'
  },
  kiwi: {
    skin: 'Sa vitamine C participe à la fabrication du collagène, une protéine des tissus, dont la peau.',
    defenses: 'Sa vitamine C contribue au fonctionnement normal du système immunitaire, sans empêcher à elle seule les infections.',
    digestion: 'Le kiwi entier apporte des fibres, utiles au transit.'
  },
  brocoli: {
    skin: 'Le brocoli apporte de la vitamine C, qui participe à la formation normale du collagène.',
    defenses: 'La vitamine C contribue au fonctionnement normal du système immunitaire.',
    heart: 'Fibres et potassium trouvent leur place dans une alimentation favorable au cœur ; le brocoli ne traite pas une maladie cardiovasculaire.',
    digestion: 'Ses fibres participent au transit. Adapter la cuisson et la quantité selon sa tolérance.',
    bones: 'Une alimentation riche en végétaux variés contribue aux apports nécessaires aux os ; un seul légume ne suffit pas.'
  },
  epinard: {
    eyes: 'Les légumes-feuilles sont une source alimentaire de lutéine et zéaxanthine, pigments présents dans la rétine. Ils ne corrigent aucun trouble visuel.',
    bones: 'Les légumes verts peuvent contribuer aux apports en nutriments impliqués dans la santé osseuse.',
    heart: 'Le potassium et les fibres font partie d’un ensemble de choix alimentaires bénéfiques, sans constituer un traitement.',
    circulation: 'Le potassium participe notamment à la régulation de la pression artérielle, dans le cadre d’une alimentation adaptée.',
    digestion: 'Les fibres contribuent au transit intestinal.'
  },
  fraise: {
    skin: 'La vitamine C aide le corps à fabriquer le collagène. L’effet ne signifie pas que les fraises effacent les rides.',
    defenses: 'La vitamine C contribue aux défenses normales, sans constituer un remède contre les infections.',
    digestion: 'Les fibres de la fraise entière participent aux apports du jour.'
  },
  betterave: {
    circulation: 'La betterave fait partie des légumes à intégrer dans une alimentation variée. Les effets de ses nitrates étudiés sur la pression artérielle ne remplacent pas une prise en charge médicale.',
    heart: 'Potassium et fibres contribuent à l’équilibre alimentaire général. Aucun effet thérapeutique individuel garanti.',
    digestion: 'Les fibres participent au transit.'
  }
};
export const NO_CURE_NOTE = 'Information nutritionnelle générale. Un aliment ne soigne pas un organe, ne détoxifie pas le foie et ne remplace pas un traitement.';
export const getNutrition = id => FOOD_NUTRITION[id] || null;
export const getFoodTopics = id => {
  const record = getNutrition(id);
  return record ? record.organs : [];
};
export function describeFoodForTopic(id, topic) {
  const custom = FOOD_INSIGHTS[id]?.[topic];
  if (custom) return custom;
  if (topic === 'eyes') return 'Certains végétaux apportent des caroténoïdes utiles dans une alimentation variée. Aucun aliment ne rend la vue parfaite.';
  if (topic === 'skin') return 'Les nutriments participent à l’entretien normal des tissus. Aucun résultat esthétique n’est garanti.';
  if (topic === 'heart' || topic === 'circulation') return 'Cet aliment peut s’intégrer à une alimentation variée favorable au système cardiovasculaire, mais ne remplace aucun traitement.';
  if (topic === 'digestion') return 'Ses fibres participent aux apports quotidiens et au bon fonctionnement du transit.';
  if (topic === 'defenses') return 'Ses vitamines participent au fonctionnement normal de l’organisme, sans prévenir à elles seules les maladies.';
  if (topic === 'bones') return 'Cet aliment contribue à la variété des apports, parmi ceux nécessaires à des os en bonne santé.';
  if (topic === 'liver') return ORGAN_TOPICS.find(entry => entry.id === 'liver').detail;
  return NO_CURE_NOTE;
}
export function scaleAmount(value, grams = 100) {
  if (value === null || typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (grams !== 100 && grams !== 150) return null;
  return Math.round((value * grams / 100) * 10) / 10;
}
