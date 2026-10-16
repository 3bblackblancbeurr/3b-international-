/** Open Food Facts uses canonical English taxonomy keys; render common EU allergens in French. */
const ALLERGEN_LABELS = Object.freeze({
  'milk':'lait',
  'eggs':'œufs',
  'fish':'poissons',
  'peanuts':'arachides',
  'nuts':'fruits à coque',
  'soybeans':'soja',
  'gluten':'gluten',
  'wheat':'blé',
  'barley':'orge',
  'oats':'avoine',
  'rye':'seigle',
  'celery':'céleri',
  'mustard':'moutarde',
  'sesame-seeds':'graines de sésame',
  'sulphur-dioxide-and-sulphites':'dioxyde de soufre et sulfites',
  'lupin':'lupin',
  'molluscs':'mollusques',
  'crustaceans':'crustacés',
  'hazelnuts':'noisettes',
  'almonds':'amandes',
  'walnuts':'noix',
  'cashew-nuts':'noix de cajou',
  'pistachio-nuts':'pistaches',
});
export function allergenLabel(input) {
  const raw=String(input||'').trim();
  if(!raw)return 'non renseigné';
  const code=raw.replace(/^[a-z]{2}:/i,'').toLowerCase();
  return ALLERGEN_LABELS[code]||code.replace(/[-_]/g,' ');
}
