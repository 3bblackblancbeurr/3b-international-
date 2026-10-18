import {CAMPAIGN_RUNTIME_SPEC,campaignEffectIds,campaignTokenIds} from './campaign-spec.js';
import {realmStaticObstacles} from './realm-layout.js';
import {obstacleDistance} from './collision.js';

const realm=(speaker,place,family,effects)=>Object.freeze({speaker,place,family,effects:Object.freeze(effects)});
export const REALM_STORY_STAGING=Object.freeze({
 algerie:realm('Amel et les voyageurs','Le relais du convoi','convoy',{rumor:'groupe_reuni',escort:'route_sure',truth:'verite_partagee',post:'relais_confiance',memory:'route_sure',value:'verite_partagee'}),
 maroc:realm('Yanis et les artisans','L’atelier des trois cloches','bells',{rumor:'signature_preservee',craft:'cloches_reparees',aid:'atelier_autonome',post:'ouvrage_transmis',memory:'cloches_reparees',value:'atelier_autonome'}),
 tunisie:realm('Nour et les secouristes','Les marches du rivage','rescue',{rumor:'issue_preparee',rescue:'personne_sauvee',hazard:'route_ouverte',post:'second_sauvetage',memory:'personne_sauvee',value:'route_ouverte'}),
 espagne:realm('Les habitants de la Plaza','La place du souffle','rhythm',{rumor:'public_ecoute',movement:'moulins_accordes',arena:'moulins_accordes',post:'plaza_vivante',memory:'moulins_accordes',value:'public_ecoute'}),
 italie:realm('Elio et les bâtisseurs','Le chantier des terrasses','restoration',{rumor:'perte_reconnue',path:'jardin_reconstruit',rebuild:'jardin_reconstruit',post:'chantier_partage',memory:'jardin_reconstruit',value:'jardin_reconstruit'}),
 turquie:realm('Deniz et les passeurs','Le relais des astrolabes','astrolabe',{rumor:'repere_conserve',signals:'ciel_aligne',commit:'parole_tenue',post:'route_nocturne_ouverte',memory:'ciel_aligne',value:'parole_tenue'}),
 estonie:realm('Mira et les observateurs','La piste du refuge','tracks',{rumor:'motif_identifie',tracking:'leurre_ecarte',decoy:'leurre_ecarte',post:'anomalie_comprise',memory:'leurre_ecarte',value:'anomalie_comprise'}),
});

/** Read-only direction for scenery and optional local dialogue. Phase, clocks,
 * wrong choices and proximity cannot invent a repaired object or a reward. */
export function realmStoryStaging(item){
 const region=item?.region,profile=REALM_STORY_STAGING[region],current=item?.campaign;
 if(item?.type!=='campaignObjective'||!profile||!current)return null;
 const phase=CAMPAIGN_RUNTIME_SPEC[region].find(row=>row.id===current.phaseId);
 if(!phase||['guardian','homecoming'].includes(phase.id))return null;
 const stepId=String(current.objective||item.id||'').split(':').at(-1);
 const step=phase.steps.find(row=>row.id===stepId)||phase.steps[current.stepIndex||0];if(!step)return null;
 const allowedEffects=campaignEffectIds(region),allowedTokens=campaignTokenIds(region);
 const effects=[...new Set(current.effects||[])].filter(id=>allowedEffects.includes(id)).sort();
 const tokens=allowedTokens.filter(id=>Number.isFinite(current.inventory?.[id])&&current.inventory[id]>0).sort();
 const restored=effects.includes(profile.effects[phase.id]);
 return{region,family:profile.family,phaseId:phase.id,stepId:step.id,stepIndex:phase.steps.indexOf(step),
  title:step.name,speaker:profile.speaker,place:profile.place,clue:step.dialogue,
  actionLabel:step.mode==='escort'?'Accompagner le groupe':step.mode==='hazard'?'Observer et franchir le passage':step.mode==='rhythm'?'Suivre le rythme':step.mode==='rebuild'?'Examiner l’assemblage':step.mode==='route'?'Vérifier ce repère':step.mode==='defend'?'Protéger l’ouvrage':'Examiner sur place',
  restored,effects,tokens,key:[region,phase.id,step.id,effects.join(','),tokens.join(',')].join('|')};
}

/** Place decorative scenery beside the existing objective, without moving its
 * canonical action point. Test the whole prop envelope against the same town
 * obstacles used for walking; no new obstacle can close an existing route. */
export function realmStoryPlacement(item){
 if(!Number.isFinite(item?.x)||!Number.isFinite(item?.z))return{x:0,z:-4.4,rotation:0};
 const obstacles=realmStaticObstacles(item.region),halfWidth=2.65,halfDepth=1.8;
 let best=null;
 for(const radius of [4.6,6.2,8])for(let index=0;index<12;index++){
  const angle=Math.PI+index*Math.PI/6,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius,rotation=angle-Math.PI,c=Math.cos(rotation),s=Math.sin(rotation);
  let clearance=Infinity;
  for(const sx of [-1,-.5,0,.5,1])for(const sz of [-1,-.5,0,.5,1]){
   const dx=sx*halfWidth,dz=sz*halfDepth,p={x:item.x+x+dx*c+dz*s,z:item.z+z-dx*s+dz*c};
   clearance=Math.min(clearance,...obstacles.map(obstacle=>obstacleDistance(p,obstacle)));
  }
  const candidate={x,z,rotation,clearance};if(clearance>=1.1)return candidate;
  if(!best||clearance>best.clearance)best=candidate;
 }
 return best||{x:0,z:-4.6,rotation:0,clearance:Infinity};
}
