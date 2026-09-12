import {nexusProgress as worldNexusProgress} from '../passport/nexus-flow.js';
// Presentation metadata only. Rewards and travel remain owned by world/engine.js.
export const NEXUS_DOORS = Object.freeze([
  {code:'FR',id:'france',country:'France',value:'Justice',guardian:'Céliane',title:'La lumière du juste',color:'#76caff',shape:'spire',material:'Acier bleu · lignes Art déco',description:'Des lignes élancées ouvrent un passage entre la mémoire de Paris et la lumière de demain.'},
  {code:'DZ',id:'algerie',country:'Algérie',value:'Loyauté',guardian:'Yliane',title:'Le serment des origines',color:'#82dcc4',shape:'keyhole',material:'Pierre claire · jade lumineux',description:'Un seuil sculpté, une lumière d’oasis. Ce qui nous relie ne s’efface pas.'},
  {code:'ES',id:'espagne',country:'Espagne',value:'Passion',guardian:'Diego',title:'La braise intérieure',color:'#ff9a77',shape:'scallop',material:'Cuivre sombre · ambre solaire',description:'Une couronne de courbes s’embrase. La passion transforme les fragments en mouvement.'},
  {code:'MA',id:'maroc',country:'Maroc',value:'Noblesse',guardian:'Naël',title:'Le souffle de l’Atlas',color:'#e8bb76',shape:'horseshoe',material:'Bronze · géométrie ciselée',description:'Un arc en fer à cheval, des gravures précises. La noblesse se reconnaît dans les actes.'},
  {code:'IT',id:'italie',country:'Italie',value:'Espoir',guardian:'Alessio',title:'L’aube du renouveau',color:'#b9dfa0',shape:'roman',material:'Travertin · or champagne',description:'Une arche monumentale se dresse au-dessus des ruines. Chaque aube laisse une place à l’espoir.'},
  {code:'TN',id:'tunisie',country:'Tunisie',value:'Courage',guardian:'Soraya',title:'Le seuil des marées',color:'#78dbe5',shape:'terrace',material:'Calcaire · lumière du rivage',description:'Des lignes de pierre et un bleu profond. Le courage est le premier pas vers l’inconnu.'},
  {code:'TR',id:'turquie',country:'Turquie',value:'Foi',guardian:'Émir',title:'La constellation des liens',color:'#c5acfa',shape:'ogive',material:'Obsidienne · astrolabe d’or',description:'Une voûte effilée relie deux horizons. La confiance éclaire ce que l’on ne voit pas encore.'},
  {code:'EE',id:'estonie',country:'Estonie',value:'Sagesse',guardian:'Eira',title:'Le silence des aurores',color:'#b0e9ff',shape:'facet',material:'Cristal sombre · argent boréal',description:'Un seuil facetté sous les aurores. Écouter, comprendre, puis choisir son chemin.'},
]);
export function doorByCode(code) {return NEXUS_DOORS.find(door=>door.code===code)||null;}
// Reuse the audited gameplay gate, including eight reconstructions, without a second ruleset.
export function nexusProgress(save) {
  const progress=worldNexusProgress(save);
  return {...progress,keys:progress.doors.filter(d=>d.sealed).map(d=>d.code),count:progress.sealCount,originUnlocked:progress.originReady};
}
export function readSelectedDoor(storage) {
  try {return doorByCode(storage?.getItem('3b:nexus-country'))?.code||'FR';} catch {return 'FR';}
}
export function canTravelFromNexus(save) {
  const encounter=save?.adventure?.encounter;
  return !encounter;
}
