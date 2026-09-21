import {GUARDIAN_VALUES} from './guardian-values.js';

const action=(id,label,kind='secondary',description='')=>({id,label,kind,description});
const unique=actions=>actions.filter((entry,index,all)=>entry&&all.findIndex(other=>other.id===entry.id)===index).slice(0,4);

function missionAction(item,save){
 if(item.type!=='hubMission')return null;
 const row=save?.hub?.missions?.[item.missionId];
 if(!row)return action('primary','Voir la mission','primary');
 if(row.status==='available')return action('primary',item.locked?'Mission verrouillée':'Commencer la mission','primary');
 if(row.status==='active')return action('primary',`Objectif ${Math.min(row.completedObjectives+1,row.totalObjectives)}/${row.totalObjectives}`,'primary');
 if(row.status==='completed'&&!row.claimed)return action('primary','Récupérer la récompense','primary');
 return action('primary','Mission accomplie','primary');
}

export function contextualActions(item,{save={},snapshot={}}={}){
 if(!item)return[];
 const region=save.region||snapshot.region;
 const valueRule=GUARDIAN_VALUES[region];
 const primary=(label='Interagir')=>action('primary',label,'primary');
 const map=()=>action('map','Voir sur la carte','navigation');
 const waypoint=()=>action('waypoint','Placer un repère','navigation');

 switch(item.type){
  case 'portal':return unique([primary(item.id==='hub'?'Retourner à la Cité':'Traverser la porte'),map()]);
  case 'hubNpc':{
   const missionIds=item.missionIds||[],hasMission=missionIds.length>0;
   const countryGuardian=item.country&&GUARDIAN_VALUES[item.country];
   return unique([
    primary('Parler'),
    hasMission?action('mission','Parler de sa mission','dialogue'):null,
    countryGuardian?action('guardian-topic',`Parler de ${countryGuardian.name}`,'dialogue'):null,
    action('directions','Demander son chemin','dialogue'),
   ]);
  }
  case 'hubGuardian':
   return unique([primary('Parler au Gardien'),action('guardian-value',`Comprendre ${item.value}`,'story'),action('return-country','Retourner dans son pays','navigation'),map()]);
  case 'hubMission':return unique([missionAction(item,save),action('mission-details','Détails et conséquences','story'),waypoint()]);
  case 'hubTransport':return unique([primary('Monter'),action('transport-line','Voir la ligne','navigation'),map()]);
  case 'hubBuilding':return unique([primary('Utiliser le bâtiment'),action('building-functions','Voir les services','inspect'),map()]);
  case 'hubDistrict':return unique([primary('Explorer le quartier'),action('district-purpose','Comprendre le quartier','inspect'),map()]);
  case 'hubEvent':return unique([primary('Intervenir'),action('event-observe','Observer avant d’agir','inspect'),map()]);
  case 'hubSecretStep':return unique([primary('Examiner'),action('memory-vision','Vision de Mémoire','power'),map()]);
  case 'hubSecret':return unique([primary('Révéler le secret'),action('memory-vision','Vision de Mémoire','power'),map()]);
  case 'valueTrial':return unique([primary(item.locked?'Épreuve scellée':'Commencer l’épreuve'),action('guardian-value',valueRule?`Comprendre ${valueRule.value}`:'Comprendre la valeur','story'),map()]);
  case 'vista':return unique([primary('Observer'),action('memory-vision','Lire les traces du lieu','power'),map()]);
  case 'landmark':return unique([primary('Découvrir le monument'),action('memory-vision','Voir son écho de mémoire','power'),action('story','Voir les travaux du pays','story')]);
  case 'job':return unique([primary('Terminer la mission'),action('journal','Voir le journal','story')]);
  case 'cooperation':return unique([primary('Ouvrir le groupe'),action('team','Préparer mon équipe','social')]);
  case 'cafe':return unique([primary('Entrer'),action('rest','Faire une pause','life'),action('journal','Préparer la prochaine sortie','story')]);
  case 'camp':return unique([primary('Gérer le refuge'),action('rest','Se reposer','life'),action('team','Préparer le groupe','social')]);
  case 'resource':return unique([primary('Récolter'),action('inspect-resource','Examiner la ressource','inspect'),action('companion-scout','Envoyer le compagnon','power')]);
  case 'patrol':return unique([primary('Engager le combat'),action('observe-enemy','Observer le danger','inspect'),action('prepare','Préparer le groupe','story'),action('avoid','Éviter pour l’instant','navigation')]);
  case 'atelier':return unique([primary('Personnaliser'),action('building-functions','Inspecter l’atelier','inspect')]);
  case 'survey':return unique([primary(item.done?'Relire le carnet':'Enregistrer le lieu'),action('memory-vision','Vision de Mémoire','power'),map()]);
  case 'sanctuary':return unique([primary('Entrer'),action('team','Voir mon équipe','social')]);
  case 'story':return unique([primary('Continuer le chapitre'),action('journal','Voir les objectifs','story'),map()]);
  case 'final':return unique([primary(save.adventure?.finished?'Revoir l’épilogue':'Affronter l’Oubli'),action('final-recap','Récapituler les huit héritages','story')]);
  case 'beacon':return unique([primary(item.done?'Souvenir retrouvé':'Recueillir le Souvenir'),action('memory-vision','Vision de Mémoire','power'),map()]);
  case 'echo':return unique([primary('Approcher l’Écho'),action('observe-enemy','Observer avant d’agir','inspect'),action('companion-scout','Envoyer le compagnon','power')]);
  case 'guardian':return unique([primary(save.seals?.includes(region)?'Défier à nouveau le Gardien':'Affronter le Gardien'),action('guardian-value',valueRule?`Relire l’épreuve de ${valueRule.value}`:'Comprendre sa valeur','story'),action('prepare','Préparer le groupe','story')]);
  default:return unique([primary(item.name||'Interagir'),waypoint()]);
 }
}

export function interactionDescription(item,actionId,{save={}}={}){
 if(!item)return '';
 if(actionId==='mission-details')return [item.category,item.importance,...(item.objectives||[]),...(item.rewards||[])].filter(Boolean).join(' · ');
 if(actionId==='building-functions')return (item.functions||[]).length?`${item.name} · ${item.functions.join(' · ')}`:`${item.name} · aucun service supplémentaire détecté.`;
 if(actionId==='district-purpose')return item.purpose||`${item.name} · explore le quartier pour découvrir ses activités.`;
 if(actionId==='event-observe')return item.effect||`${item.name} · observe la situation avant d’intervenir.`;
 if(actionId==='inspect-resource')return `${item.name} · cette ressource sert au développement de ton refuge et de tes constructions.`;
 if(actionId==='observe-enemy')return `${item.name} · observe ses mouvements, prépare ton équipement et choisis quand engager la rencontre.`;
 if(actionId==='guardian-value'){
  const region=item.region||save.region,rule=GUARDIAN_VALUES[region];
  return rule?`${rule.name} protège ${rule.value}. Son épreuve demande de comprendre cette valeur avant de chercher la victoire.`:'Le Gardien protège une valeur liée à son territoire.';
 }
 if(actionId==='final-recap')return `Le Cercle exige les huit pays reconstruits, les huit valeurs comprises et les huit Gardiens réunis.`;
 if(actionId==='memory-vision')return `La Vision de Mémoire cherche ce que ce lieu, cet objet ou ce Souvenir a conservé sans le ramasser automatiquement.`;
 if(actionId==='companion-scout')return `Ton compagnon peut examiner la zone et t’aider à repérer une piste sans valider la mission à ta place.`;
 return item.name||'';
}
