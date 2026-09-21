import {cardById,countryById} from './catalog.js';
import {CHAPTERS} from './chapters.js';
import {GUARDIAN_VALUES} from './guardian-values.js';
import {cinematicSpec} from './cinematic-director.js';
import {STORY_CANON} from './story-canon.js';

const shortGuardian=(region,cardId)=>{
 const rule=GUARDIAN_VALUES[region],card=cardById[cardId||rule?.card];
 return {rule,card,name:(card?.name||rule?.name||'Gardien').split(' — ')[0]};
};

export function storyCinematicPresentation(event){
 if(!event?.kind||!event?.key)return null;
 const region=event.context?.region||event.region, country=countryById[region], chapter=CHAPTERS[region],guardian=shortGuardian(region,event.context?.card);
 const base={...cinematicSpec(event.kind,region),context:event.context||{},countryName:country?.name||'3B',value:guardian.rule?.value||'Héritage',key:event.key,kind:event.kind,region,card:event.context?.card||null,audioState:'mission',voiceCharacter:'narrator',nextLabel:'Continuer'};
 switch(event.kind){
  case 'world-opening':return {...base,countryName:'3B INTERNATIONAL',value:'Héritage',kicker:'LES HUIT PORTES',title:'LE MONDE DU 3B',detail:'Huit héritages ont été séparés. Dans le monde réel du 3B, le Cercle ne cherche pas une neuvième valeur : il faut retrouver ce qui relie les huit.',nextLabel:'Prendre le contrôle'};
  case 'country-first-entry':return {...base,kicker:(country?.name||region).toUpperCase()+' · PREMIÈRE ENTRÉE',title:country?.title||'Une nouvelle porte',detail:country?.lore||'Le pays attend que ses liens soient reconstruits.'};
  case 'story-alliance':return {...base,kicker:'UN LIEN SE FORME',title:chapter?.resident?.split(',')[0]||'Un habitant te fait confiance',detail:chapter?.need||'Une première alliance ouvre la suite de l’histoire.'};
  case 'memory-fragment':return {...base,kicker:'FRAGMENT DE MÉMOIRE',title:'Un souvenir répond',detail:'Un fragment de mémoire est enregistré dans ta progression.'};
  case 'story-power':return {...base,kicker:'RÉSONANCE',title:'Un pouvoir se réveille',detail:'Ce lien n’est plus seulement un souvenir : il devient une capacité utile à l’exploration et à la reconstruction.'};
  case 'story-restoration':{
   const stage=event.context?.stage||1,name=chapter?.restores?.[Math.max(0,stage-1)]||'Le quartier';
   return {...base,kicker:'RECONSTRUCTION · ÉTAPE '+stage,title:name+' reprend vie',detail:stage===3?(chapter?.ending||'Le pays rejoint pleinement la Cité des Huit Héritages.'):'Tes actions modifient maintenant réellement le quartier.'};
  }
  case 'guardian-value-complete':return {...base,card:guardian.rule?.card||null,audioState:'guardian',voiceCharacter:guardian.rule?.card||'narrator',kicker:(guardian.rule?.value||'VALEUR').toUpperCase(),title:(guardian.rule?.value||'La valeur')+' est reconnue',detail:`${guardian.name} peut désormais se présenter. Tu n’affrontes pas seulement sa force : tu as compris la valeur qu’il protège.`};
  case 'guardian-intro':return {...base,card:event.context?.card||guardian.rule?.card||null,audioState:'guardian',voiceCharacter:event.context?.card||guardian.rule?.card||'narrator',kicker:(guardian.rule?.value||'GARDIEN').toUpperCase()+' · GARDIEN',title:guardian.name+' se tient devant toi',detail:`${guardian.rule?.value?guardian.rule.value+' · ':''}${chapter?.guardian||'Observe son rythme, protège ton groupe et attends l’ouverture.'}`,nextLabel:'Commencer le combat'};
  case 'important-combat-result':{
   const victory=event.context?.result==='victory';
   return {...base,card:event.context?.card||guardian.rule?.card||null,audioState:'guardian',voiceCharacter:event.context?.card||guardian.rule?.card||'narrator',kicker:victory?'LIBÉRATION':'REPLI',title:victory?`${guardian.name} rejoint tes alliés`:'Le Gardien tient encore',detail:victory?`Le sceau de ${country?.name||region} répond. ${guardian.name} rejoint durablement ta collection et la dernière restauration du pays peut commencer.`:'La défaite ne détruit pas ta progression. Prépare ton groupe, relis les indices et reviens.',nextLabel:victory?'Poursuivre la reconstruction':'Revenir dans le monde'};
  }
  case 'guardian-homecoming':return {...base,card:guardian.rule?.card||null,audioState:'guardian',voiceCharacter:guardian.rule?.card||'narrator',kicker:'RETOUR À LA CITÉ',title:guardian.name+' rejoint la Cité',detail:`Le pays de ${country?.name||region} est reconstruit. ${guardian.name} est maintenant visible dans la Cité des Huit Héritages et reste lié à tes prochaines expéditions.`,nextLabel:'Entrer dans la Cité'};
  case 'companion-first-bond':return {...base,kicker:'NOUVEAU LIEN',title:(cardById[event.context?.card]?.name||'Un compagnon')+' te fait confiance',detail:'Ce personnage peut désormais voyager avec toi et renforcer ton groupe.'};
  case 'discovery':return {...base,kicker:'DÉCOUVERTE',title:'Un lieu rejoint ton carnet',detail:'Cette découverte est enregistrée dans ta progression d’exploration.'};
  case 'final-combat-intro':return {...base,audioState:'guardian',kicker:'LE LIEN MANQUANT',title:'L’Oubli rassemble les huit échos',detail:STORY_CANON.finale.revelation+' '+STORY_CANON.oubli.monster,nextLabel:'Affronter la manifestation de l’Oubli'};
  case 'story-finale':return {...base,audioState:'guardian',kicker:'L’UNION RETROUVÉE',title:'Le Cercle répond',detail:STORY_CANON.finale.aftermath+' '+STORY_CANON.finale.signature};
  default:return null;
 }
}
