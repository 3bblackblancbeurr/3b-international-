import {CANON_WORLDS,STORY_CANON} from '../story-canon.js';

export const HUB_CANON_LAWS=Object.freeze({
 version:1,
 title:'La Cité des Huit Héritages',
 visualReference:'CANON_USER_REFERENCE_2026-09-24_CITE_HUIT_HERITAGES',
 identity:Object.freeze({
  palette:['noir profond','or champagne','bleu Matrix'],
  scale:'métropole ouverte, dense, verticale et lisible',
  forbidden:Object.freeze([
   'petite plateforme centrale entourée de huit portes',
   'portes-pays flottantes sans quartier',
   'quartiers décoratifs sans fonction',
   'copier-coller des huit pays avec simple recoloration',
  ]),
 }),
 safeZone:Object.freeze({
  unique:true,
  hostileMonsters:false,
  wildPvP:false,
  damage:false,
  death:false,
  rule:'Le Hub principal est l’unique grande zone totalement sûre. Les conflits, boss et ennemis appartiennent aux royaumes et aux activités explicitement instanciées.',
 }),
 structure:Object.freeze({
  districts:10,
  usefulBuildings:true,
  dispersedCountryGates:8,
  central:Object.freeze(['Place de l’Héritage','Tour du Cercle Brisé']),
  transports:Object.freeze(['3B Express','bateaux','téléphériques','tyroliennes','navettes','marche']),
 }),
 story:Object.freeze({
  hero:STORY_CANON.hero.name,
  heroRole:STORY_CANON.hero.role,
  loop:'Cité → préparation → Porte → royaume → mission/épreuve → Gardien → fragment → retour Cité → évolution visible',
  finalRequirement:STORY_CANON.finale.requirement,
  oubli:STORY_CANON.oubli.nature,
 }),
 progression:Object.freeze({
  singleIdentity:'Passeport 3B / même user_id / sauvegarde autoritaire',
  visibleEvolution:true,
  rule:'Chaque Gardien libéré restaure visiblement sa Porte et son quartier d’ancrage. La Place et la Tour réagissent au total des fragments.',
  npcMemory:true,
  longTermConsequences:true,
 }),
 countries:Object.freeze(Object.fromEntries(Object.entries(CANON_WORLDS).map(([region,data])=>[
  region,Object.freeze({guardian:data.guardian,value:data.value}),
 ]))),
 arsenal:Object.freeze({
  canonicalWeapons:16,
  rule:'Conserver l’arsenal canonique de 16 armes ; ne pas ajouter d’armes arbitraires.',
 }),
 quality:Object.freeze({
  mobileFirst:true,
  noDoneWithoutRealTest:true,
  target:'densité intelligente, verticalité, landmarks visibles, proportions crédibles, navigation claire et performances mesurées',
 }),
});

export const HUB_DISTRICT_NAMES=Object.freeze([
 'Place de l’Héritage',
 'Tour du Cercle Brisé',
 'Archives de la Mémoire',
 'Arène 3B',
 'Quartier Commerce',
 'Quartier Communauté',
 'Quartier Innovation et IA',
 'Docks et Transports',
 'Portail Ville 3B',
 'Jardins de l’Unité',
]);
