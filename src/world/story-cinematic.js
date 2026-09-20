import {cardById,countryById} from './catalog.js';
import {CHAPTERS} from './chapters.js';
import {cinematicSpec} from './cinematic-director.js';

const VALUES={france:'Justice',algerie:'Loyauté',maroc:'Noblesse',tunisie:'Courage',turquie:'Foi',espagne:'Passion',italie:'Espoir',estonie:'Sagesse'};
const residentName=region=>(CHAPTERS[region]?.resident||'Gardien').split(',')[0].trim();
const guardianName=(region,cardId)=>cardById[cardId]?.name?.split(' — ')[0]||residentName(region);

export function storyCinematicPresentation(event){
 if(!event?.kind||!event?.key)return null;
 const region=event.context?.region||event.region||'hub';
 const country=countryById[region],chapter=CHAPTERS[region],value=VALUES[region]||'Héritage';
 const guardian=guardianName(region,event.context?.card);
 const spec=cinematicSpec(event.kind,region);
 const base={...spec,key:event.key,kind:event.kind,region,context:event.context||{},countryName:country?.name||'3B',value,nextLabel:'Continuer'};
 switch(event.kind){
  case 'country-first-entry':return {...base,kicker:`${(country?.name||region).toUpperCase()} · ${value.toUpperCase()}`,title:country?.title||'Une nouvelle porte',detail:country?.lore||'Une nouvelle partie du Monde 3B se révèle.',nextLabel:'Entrer dans le pays'};
  case 'story-alliance':return {...base,kicker:'UN LIEN SE FORME',title:chapter?.resident||'Une alliance commence',detail:chapter?.need||'Une présence du pays accepte de marcher avec toi.'};
  case 'story-power':return {...base,kicker:`${value.toUpperCase()} · RÉSONANCE`,title:'Un pouvoir se réveille',detail:'La lumière Matrix se condense autour de toi. Cette résonance devient une capacité réelle de ton voyage.'};
  case 'story-restoration':{
   const stage=event.context?.stage||1,name=chapter?.restores?.[Math.max(0,stage-1)]||'Le quartier';
   return {...base,kicker:`RECONSTRUCTION · ${String(stage).padStart(2,'0')}/03`,title:`${name} reprend vie`,detail:stage===3?(chapter?.ending||'Le pays retrouve son souffle.'):'La lumière, les habitants et les signes du pays répondent à tes actions.'};
  }
  case 'guardian-intro':return {...base,kicker:`${value.toUpperCase()} · GARDIEN`,title:`${guardian} se tient devant toi`,detail:chapter?.guardian||'Observe, comprends sa valeur, puis attends l’ouverture.',nextLabel:'Commencer le combat'};
  case 'important-combat-result':{
   const victory=event.context?.result==='victory';
   return {...base,kicker:victory?'LE SCEAU RÉPOND':'REPLI',title:victory?`${guardian} reconnaît ton passage`:'Le Gardien tient encore',detail:victory?`${value} n’est plus seulement un symbole : elle devient une part du Cercle.`:'La progression est conservée. Recompose ton groupe et reviens avec une autre approche.',nextLabel:victory?'Continuer':'Revenir dans le monde'};
  }
  case 'companion-first-bond':return {...base,kicker:'NOUVEAU LIEN',title:`${cardById[event.context?.card]?.name||'Un compagnon'} te rejoint`,detail:'Un nouveau lien est inscrit dans le Monde 3B.'};
  case 'discovery':return {...base,kicker:`${(country?.name||'3B').toUpperCase()} · DÉCOUVERTE`,title:'Un lieu rejoint ton carnet',detail:'Le monde s’ouvre sans interrompre ton exploration.'};
  case 'final-combat-intro':return {...base,kicker:'LE CERCLE BRISÉ',title:'L’Oubli rassemble les huit échos',detail:'Huit portes. Huit valeurs. Une dernière fracture à traverser.',nextLabel:'Affronter l’Oubli'};
  case 'story-finale':return {...base,kicker:'L’UNION RETROUVÉE',title:'Le Cercle répond',detail:'Les huit héritages restent distincts. Ensemble, ils forment désormais une force vivante.',nextLabel:'Reprendre le contrôle'};
  default:return null;
 }
}
