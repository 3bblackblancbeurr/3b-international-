import {hubNpcMemory} from './npc-memory.js';
export const HUB_DIALOGUE_INTENTS=Object.freeze({
 identity:{label:'Qui es-tu ?'},
 district:{label:'Parle-moi de ce quartier'},
 mission:{label:'As-tu besoin d’aide ?'},
 guardian:{label:'Que sais-tu du Gardien ?'},
 oubli:{label:'Que sais-tu de l’Oubli ?'},
 clue:{label:'J’ai besoin d’un indice'},
 memory:{label:'Que te rappelles-tu d’avant ?'},
 opinion:{label:'Qu’est-ce qui a changé ici ?'},
 goodbye:{label:'À bientôt'},
});
export const HUB_DIALOGUE_INTENT_SET=new Set(Object.keys(HUB_DIALOGUE_INTENTS));

const first=(array)=>Array.isArray(array)&&array.length?array[0]:null;
const activeMission=(item,missions)=>first((item.missionIds||[]).map(id=>[id,missions?.[id]]).filter(([,row])=>row?.status==='active'));
const completedMission=(item,missions)=>first((item.missionIds||[]).map(id=>[id,missions?.[id]]).filter(([,row])=>row?.status==='completed'));

export function hubDialogueIntents(item,save,{hour=12,weather='clear'}={}){
 const missions=save?.hub?.missions||{},active=activeMission(item,missions),completed=completedMission(item,missions),memory=hubNpcMemory(item,save,{hour,weather}),options=['identity','district'];
 if(active)options.push('clue');else if((item.missionIds||[]).length)options.push('mission');
 if(item.country||item.guardianRegion||item.guardian||item.value)options.push('guardian');
 if((save?.seals?.length||0)>0||item.npcId==='noah_leroux'||item.npcId==='the_conductor')options.push('oubli');
 if((save?.beacons?.length||0)>0||completed||memory.familiarityScore>=18)options.push('memory');
 if((save?.seals?.length||0)>0||weather!=='clear'||hour>=20||hour<6||memory.familiarityScore>=45)options.push('opinion');
 options.push('goodbye');
 return [...new Set(options)].map(id=>({id,label:HUB_DIALOGUE_INTENTS[id].label}));
}

export function hubDialogueIntentResponse(item,intentId,save,{hour=12,weather='clear',guardianName=null,value=null,countryName=null,guardianLiberated=false}={}){
 const missions=save?.hub?.missions||{},active=activeMission(item,missions),completed=completedMission(item,missions),name=item.name||'Cette personne',district=item.district||'ce quartier',history=save?.hub?.stats?.dialogueHistory||[],memory=hubNpcMemory(item,save,{hour,weather}),asked=history.filter(row=>row.npcId===item.npcId&&row.sceneId==='intent'&&row.choiceId===intentId).length,liberated=guardianLiberated||memory.guardianLiberated;
 switch(intentId){
  case 'identity':return {text:memory.familiarity==='trusted'?`${name}. On s’est assez parlé pour dépasser les présentations. Tu connais mon rôle ; ce qui m’intéresse maintenant, c’est ce que tes actes changent réellement dans la Cité.`:memory.familiarity==='familiar'?`${name}. Je te reconnais maintenant. ${item.role||'Habitant du Monde 3B'}. Nos conversations commencent à avoir une continuité.`:asked>1?`Tu connais déjà mon nom : ${name}. Si tu reviens me poser la question, c’est peut-être que tu cherches autre chose que mon métier.`:`${name}. ${item.role||'Habitant du Monde 3B'}. Je vis ici ; ce que je sais vient surtout de ce que j’ai vu, pas de ce que la ville raconte sur elle-même.`};
  case 'district':return {text:memory.tension>=40?`Ici, ${district} est plus tendu que d’habitude. Les horaires ne suffisent pas à l’expliquer : une mission en cours, la météo ou ce qui n’a pas encore été réglé change réellement les comportements.`:`Ici, ${district} change selon l’heure, les habitants et ce qui a déjà été restauré. Regarde aussi les détails : tout ce qui compte n’a pas forcément un marqueur.`};
  case 'mission':
   return active?{text:`Tu m’aides déjà. Termine d’abord l’étape ${active[1].completedObjectives+1} sur ${active[1].totalObjectives}.`}:completed?{text:'Tu as déjà fait ce que je t’avais demandé. Regarde maintenant ce que cette action a changé autour de nous.'}:{text:(item.missionIds||[]).length?'Oui. Une mission est liée à ce lieu ; commence-la depuis son point dans la Cité.':'Pas pour l’instant. Mais les événements du quartier peuvent encore créer de nouvelles situations.'};
  case 'guardian':return {text:guardianName?(liberated?`${guardianName} est revenu dans la Cité. Regarde ce qu’il fait maintenant : libérer un Gardien n’efface pas son conflit avec ${value||'sa valeur'}, cela lui donne une nouvelle manière de le vivre.`:`${guardianName} ne protège pas simplement ${value||'une valeur'}. Son épreuve vient de sa propre difficulté à vivre cette valeur. Si tu veux le comprendre, observe ce qu’il refuse de faire autant que ce qu’il fait.`):`Le Gardien lié à ${countryName||'ce territoire'} ne se résume pas à un combat. Les habitants, les Souvenirs et l’état du quartier te diront pourquoi il est devenu Gardien.`};
  case 'oubli':return {text:'L’Oubli préfère les choses séparées : un souvenir sans contexte, une valeur sans personne, une histoire sans transmission. Quand tout devient isolé, il peut remplacer le sens par une version plus simple.'};
  case 'clue':{
   if(!active)return {text:'Je n’ai pas d’indice utile pour toi maintenant.'};
   const n=Math.min(active[1].completedObjectives+1,active[1].totalObjectives);
   return {text:`Pour l’étape ${n}, cherche une action réelle dans le monde. Si l’objectif parle de transport, de personne, de bâtiment ou de secret, le simple fait d’ouvrir le journal ne suffira pas.`};
  }
  case 'memory':return {text:memory.lastIntent&&memory.conversationTurns>=2?`Je me rappelle que notre dernier sujet était « ${HUB_DIALOGUE_INTENTS[memory.lastIntent]?.label||memory.lastIntent} ». Ce que je te dis maintenant doit rester cohérent avec ça, sauf si le monde a réellement changé depuis.`:(save?.beacons?.length||0)>0?'Depuis que les Souvenirs reviennent, certaines personnes se rappellent des détails différents. Ne cherche pas une seule version parfaite : compare ce qui revient chez plusieurs témoins.':'Avant, j’ai surtout des impressions : des lieux plus pleins, des noms mieux ancrés. Les vrais Souvenirs diront davantage que ma nostalgie.'};
  case 'opinion':return {text:completed?`Depuis que tu as terminé ${completed[0]}, je vois des changements que je n’aurais pas remarqués avant. Les missions doivent laisser des traces, sinon elles n’ont servi qu’à remplir un journal.`:weather==='storm'||weather==='heavy_rain'?'La ville change sous cette météo. Certains restent à l’abri, d’autres sont appelés dehors : regarde qui bouge et qui disparaît.':hour>=20||hour<6?'La nuit révèle d’autres habitudes. Les transports, les secrets et même les conversations ne sont pas les mêmes.':liberated?`Depuis le retour du Gardien lié à mon pays, l’ambiance a changé. Ce n’est pas une fin heureuse automatique : on apprend surtout à vivre la valeur autrement.`:memory.familiarity==='trusted'?`Je te fais davantage confiance qu’au début, parce que je peux comparer ce que tu dis avec ce que tu as réellement fait ici.`:'Depuis les premières restaurations, la Cité paraît plus vivante. Mais ce sont surtout les comportements des habitants qui me le font sentir.'};
  case 'goodbye':return {text:memory.familiarity==='trusted'?'À bientôt. Je me souviendrai de ce qu’on s’est dit ; reviens quand le monde aura vraiment changé.':'À bientôt. Reviens après avoir fait quelque chose dans le monde ; j’aurai peut-être autre chose à te dire.',close:true};
  default:return {text:'Je n’ai rien de fiable à ajouter là-dessus.'};
 }
}
