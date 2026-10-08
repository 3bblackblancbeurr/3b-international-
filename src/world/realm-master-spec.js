/**
 * MONDE 3B — master visual/narrative production target, 2026-10-07.
 *
 * Realm layout and streamed terrain use these surface ratios. The guardian
 * poster remains the art reference: the shipped humanoids are web adaptations
 * on the existing rigs, not film-quality final character sculptures.
 *
 * Country evidence: heritage.js (real monuments), settlements.js (settlement
 * references). The fictional guardian plot must not be presented as history.
 */
export const REALM_MASTER_SPEC=Object.freeze({
 france:Object.freeze({
  areaTargetMultiplier:50,
  environments:['Paris et passages historiques','vallées et villages de Loire','crêtes alpines et forêts'],
  landmarks:['Tour Eiffel','arcs et passages de Paris','châteaux et maisons de Loire'],
  livingSystems:['café de quartier','transport urbain','marchés et artisans','cycle jour/pluie et routines'],
  encounter:'Le Tribunal des Échos',
  identity:'Pierres de taille, verrières, ardoise, avenues et jardins habités.',
 }),
 algerie:Object.freeze({
  areaTargetMultiplier:100,
  environments:['Casbah et terrasses d’Alger','vallées et oasis du Sahara','monts et villages de Kabylie'],
  landmarks:['Mémorial du Martyr','architecture de la Casbah','oasis et jardins'],
  livingSystems:['artisanat','marchés de quartier','vie des terrasses','routes de montagne'],
  encounter:'La Porte des Deux Alliés',
  identity:'Zellige, voûtes, roches claires, cours ombragées et chaleur atmosphérique.',
 }),
 maroc:Object.freeze({
  areaTargetMultiplier:200,
  environments:['cours et souks de Marrakech','Casablanca et côte atlantique','villages et sommets de l’Atlas'],
  landmarks:['Mosquée Hassan II','médina et riads','architecture de l’Atlas'],
  livingSystems:['souks et artisanat','portes et passages','jardins irrigués','villages'],
  encounter:'La Cour des Serments',
  identity:'Stuc sculpté, bois, tadelakt, mosaïques, patios et terrasses.',
 }),
 tunisie:Object.freeze({
  areaTargetMultiplier:100,
  environments:['Carthage et côte méditerranéenne','Sidi Bou Saïd','El Jem et oliveraies'],
  landmarks:['Amphithéâtre d’El Jem','ruines de Carthage','maisons bleu-blanc de Sidi Bou Saïd'],
  livingSystems:['port et pêche','céramique','oliveraies','marchés côtiers'],
  encounter:'Le Passage des Vents',
  identity:'Blanc chaulé, bleu vif, pierre romaine, jardins et brises marines.',
 }),
 espagne:Object.freeze({
  areaTargetMultiplier:150,
  environments:['Barcelone et formes modernistes','Séville et patios andalous','montagnes et oliveraies'],
  landmarks:['Sagrada Família','patios et azulejos','architecture andalouse'],
  livingSystems:['ateliers et places vivantes','artisanat céramique','agriculture','musique des quartiers'],
  encounter:'Les Sept Battements',
  identity:'Pierre rose, céramique colorée, cours intérieures et lumière de fin du jour.',
 }),
 italie:Object.freeze({
  areaTargetMultiplier:150,
  environments:['Rome antique','Florence et ateliers de la Renaissance','collines et vignes de Toscane'],
  landmarks:['Colisée','places et cours de Florence','villages et vignes toscanes'],
  livingSystems:['ateliers de restauration','petits marchés','jardins et vignes','places et habitants'],
  encounter:'L’Atelier des Retours',
  identity:'Travertin, arcs, colonnes, stuc, volets, cyprès et pavés patinés.',
 }),
 turquie:Object.freeze({
  areaTargetMultiplier:200,
  environments:['Istanbul historique','vallées rocheuses de Cappadoce','plateaux d’Anatolie'],
  landmarks:['Tour de Galata','bazars et coupoles','cheminées de fée de Cappadoce'],
  livingSystems:['bazars','ponts et ferries','ateliers de tissage','villages des plateaux'],
  encounter:'Le Sanctuaire des Repères',
  identity:'Pierre et brique, coupoles, bois, faïence et vallées minérales.',
 }),
 estonie:Object.freeze({
  areaTargetMultiplier:100,
  environments:['vieille ville de Tallinn','forêts et tourbières de Lahemaa','îles et rivages baltiques'],
  landmarks:['Cathédrale Alexandre-Nevski','remparts et maisons de Tallinn','paysages du parc de Lahemaa'],
  livingSystems:['ateliers d’artisans','ports baltes','sentiers en forêt','villages et saisons'],
  encounter:'Le Bois des Faux Reflets',
  identity:'Toits de Tallinn, pinède, pierre humide, brume, mer baltique et ciel boréal.',
 }),
});

export const GUARDIAN_MASTER_SPEC=Object.freeze({
 france:Object.freeze({name:'Céliane',card:'C165',value:'Justice',totem:'Coq royal',weapon:'Rapière',resonance:'Lecture juste',visual:'Bleu, argent et or',illustrativeHp:9200,
  bossPhases:['Écouter les échos','Distinguer la preuve','Réparer sans punir aveuglément']}),
 algerie:Object.freeze({name:'Yliane',card:'C169',value:'Loyauté',totem:'Fennec',weapon:'Flyssa',resonance:'Lien fidèle',visual:'Ivoire, émeraude et or',illustrativeHp:9800,
  bossPhases:['Protéger l’alliance','Tenir le lien','Rendre la liberté sans abandonner']}),
 maroc:Object.freeze({name:'Naël',card:'C171',value:'Noblesse',totem:'Lion',weapon:'Deux poignards marocains',resonance:'Garde noble',visual:'Noir, rouge et or',illustrativeHp:10100,
  bossPhases:['La garde du serment','Le prix de la protection','L’honneur avant la victoire']}),
 tunisie:Object.freeze({name:'Soraya',card:'C170',value:'Courage',totem:'Aigle',weapon:'Lance et bouclier',resonance:'Pas de courage',visual:'Ivoire, bronze et rouge',illustrativeHp:9600,
  bossPhases:['Observer les vents','Avancer pour sauver','Assumer le passage']}),
 espagne:Object.freeze({name:'Diego',card:'C172',value:'Passion',totem:'Taureau',weapon:'Épée de Tolède',resonance:'Élan maîtrisé',visual:'Rouge, noir et or',illustrativeHp:9300,
  bossPhases:['Le rythme naissant','La limite de l’ardeur','L’élan maîtrisé']}),
 italie:Object.freeze({name:'Alessio',card:'C166',value:'Espoir',totem:'Loup',weapon:'Épée d’escrime et gantelet',resonance:'Reprise',visual:'Blanc, vert et or',illustrativeHp:9000,
  bossPhases:['La première chute','Rebâtir le rempart','Ouvrir une autre voie']}),
 turquie:Object.freeze({name:'Émir',card:'C168',value:'Foi',totem:'Ours',weapon:'Kilij',resonance:'Ancrage',visual:'Acier et turquoise',illustrativeHp:10500,
  bossPhases:['Les signes troublés','Choisir un repère','Tenir sans certitude absolue']}),
 estonie:Object.freeze({name:'Eira',card:'C167',value:'Sagesse',totem:'Louve',weapon:'Deux lames baltiques',resonance:'Clarté',visual:'Argent et bleu boréal',illustrativeHp:8800,
  bossPhases:['Les reflets trompeurs','Observer sans conclure','Décider au moment juste']}),
});

export const REALM_IDS=Object.freeze(Object.keys(REALM_MASTER_SPEC));
/**
 * Ratio of land AREA, not radius/linear extent. realm-layout and realm-streaming
 * consume this pure function; it never allocates an entire realm heightmap.
 */
export const targetRealmRadius=(hubRadius,region)=>{
 const mul=REALM_MASTER_SPEC[region]?.areaTargetMultiplier;
 return Number.isFinite(hubRadius)&&hubRadius>0&&mul?hubRadius*Math.sqrt(mul):null;
};
export const guardianMasterFor=region=>GUARDIAN_MASTER_SPEC[region]||null;
