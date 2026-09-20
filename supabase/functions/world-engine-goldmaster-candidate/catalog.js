import source from './cards-source.json' with {type:'json'};
export const COUNTRIES = [
 {id:'france',name:'France',title:'Les Jardins de la mémoire',color:'#7bbdff',ground:'#253c52',stone:'#7c94a4',sky:'#101f36',biome:'city',symbol:'✧',portal:[-22,-24],lore:'Sous les arches bleues, les souvenirs prennent la forme de lumière.'},
 {id:'italie',name:'Italie',title:'Les Terrasses vivantes',color:'#95e4b6',ground:'#35514c',stone:'#c4b9a0',sky:'#182b32',biome:'terrace',symbol:'▱',portal:[14,-40],lore:'Des jardins suspendus relient les vestiges d’une cité qui se réveille.'},
 {id:'estonie',name:'Estonie',title:'La Forêt des aurores',color:'#9ce8f4',ground:'#34515c',stone:'#a0c7d2',sky:'#122b3c',biome:'ice',symbol:'❋',portal:[43,-24],lore:'Chaque clairière abrite un écho. Suis les lumières entre les sapins.'},
 {id:'turquie',name:'Turquie',title:'L’Observatoire des lunes',color:'#e9a4e8',ground:'#3d304d',stone:'#a793b4',sky:'#261d3c',biome:'dome',symbol:'☾',portal:[42,13],lore:'Huit constellations veillent sur les coupoles et les pierres flottantes.'},
 {id:'algerie',name:'Algérie',title:'L’Oasis des fragments',color:'#b8dda2',ground:'#796747',stone:'#c7b487',sky:'#323c3a',biome:'desert',symbol:'◇',portal:[24,42],lore:'L’eau et les arches du désert gardent la trace des passages oubliés.'},
 {id:'tunisie',name:'Tunisie',title:'Les Rivages de Carthage',color:'#ffb3a4',ground:'#68646a',stone:'#ddd1b2',sky:'#233747',biome:'coast',symbol:'⌘',portal:[-9,47],lore:'Des colonnes éclairées bordent une mer de brume et de souvenirs.'},
 {id:'maroc',name:'Maroc',title:'Les Cimes de l’Atlas',color:'#f7c77e',ground:'#665144',stone:'#c29972',sky:'#342c35',biome:'atlas',symbol:'☀',portal:[-42,25],lore:'Les portes dorées s’ouvrent sur des jardins protégés par les montagnes.'},
 {id:'espagne',name:'Espagne',title:'Les Falaises du crépuscule',color:'#ff9e86',ground:'#6c4546',stone:'#cf9278',sky:'#382330',biome:'cliff',symbol:'♜',portal:[-48,-8],lore:'Le vent traverse les moulins. Une lumière rouge court sur les falaises.'},
];

export const countryById = Object.fromEntries(COUNTRIES.map(c=>[c.id,c]));
export const SOURCE=source;
const slug=name=>COUNTRIES.find(c=>c.name===name)?.id||'3b';
export const CARDS=source.cards.map(c=>{
 const country=slug(c.country),character=c.number<=172;
 const role=c.subtype.includes('Gardien')?'protecteur':c.number%5===0?'soigneur':c.number%5===1?'éclaireur':c.number%5===2?'mystique':c.defense>c.attack?'protecteur':'assaillant';
 return {...c,originalAttack:c.attack,originalDefense:c.defense,country,countryName:c.country,character,role,
  symbol:countryById[country]?.symbol||'3B',power:c.effect,attack:character?Math.round(9+c.attack*1.2):0,health:character?60+c.defense*3:0,
  trait:character?({protecteur:'Rempart : +12 de vitalité à l’équipe.',soigneur:'Renaissance : la garde rend 4 points de vitalité.',éclaireur:'Instinct : +8 % de vitesse dans le monde.',mystique:'Résonance : fenêtre de pacte élargie.',assaillant:'Impact : +4 aux frappes de l’équipe.'}[role]):explorationEffect(c),
 };
});
export const cardById=Object.fromEntries(CARDS.map(c=>[c.id,c]));
export const CHARACTERS=CARDS.filter(c=>c.character);
export const CATEGORIES=[...new Set(CARDS.map(c=>c.category))];
export function cardSlot(c){return c.category==='Terrain'?'terrain':c.category==='Ambiance'?'ambiance':c.category==='Fragment / Pierre'?(c.subtype==='Pierre'?'pierre':'fragment'):c.category==='Piège'?'trap':c.category==='Bonus'||c.category==='Stratégie'?'support':c.category==='Énergie'?'energy':null;}
export function explorationEffect(c){
 const slot=cardSlot(c);
 return ({terrain:'Terrain : +10 de vitalité au combat.',ambiance:'Ambiance : +3 aux frappes.',fragment:'Fragment : +3 aux frappes du Leader.',pierre:'Pierre : +10 de vitalité au combat.',trap:'Piège : bloque la prochaine riposte. Une utilisation par rencontre.',support:'Soutien : rend 24 de vitalité. Une utilisation par rencontre.',energy:'Énergie : +1 concentration au début du combat.'})[slot]|| (c.category==='Mission'?'Mission : témoigne d’un objectif accompli dans ce pays.':c.category==='Passeport'?'Passeport : reçu lors de ta première visite dans ce pays.':c.category==='Porte'?'Porte : atteste de la victoire contre ce gardien.':'Objet de collection.');
}
export const craftPrice=c=>c.character?0:20+(Number(c.cost)||0)*10;
export function validateCatalog(cards) {
 if (!Array.isArray(cards) || !cards.length || cards.length > 12000) throw Error('Le catalogue doit contenir 1 à 12 000 cartes.');
 const ids=new Set();
 for (const c of cards) {
  if (!c || !/^C\d{3}$/.test(c.id) || ids.has(c.id)) throw Error('Identifiant de carte invalide ou dupliqué.');
  ids.add(c.id);
  if ((!countryById[c.country]&&c.country!=='3b') || !['protecteur','soigneur','éclaireur','mystique','assaillant'].includes(c.role)) throw Error('Pays ou rôle inconnu.');
  for (const key of ['name','power','rarity','trait']) if(typeof c[key]!=='string'||!c[key].trim()||c[key].length>240) throw Error('Texte de carte invalide.');
  if (!Number.isInteger(c.attack)||c.attack<0||c.attack>100||!Number.isInteger(c.health)||c.health<0||c.health>500) throw Error('Statistiques invalides.');
  if (c.art && (!/^\/world\/cards\/[a-zA-Z0-9/_-]+\.(webp|png|jpg|avif)$/.test(c.art)||c.art.includes('..'))) throw Error('Illustration locale attendue dans /world/cards/.');
 }
 return cards;
}
