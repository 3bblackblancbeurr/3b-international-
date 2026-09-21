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
 const missions=save?.hub?.missions||{},active=activeMission(item,missions),completed=completedMission(item,missions),options=['identity','district'];
 if(active)options.push('clue');else if((item.missionIds||[]).length)options.push('mission');
 if(item.country||item.guardianRegion||item.guardian||item.value)options.push('guardian');
 if((save?.seals?.length||0)>0||item.npcId==='noah_leroux'||item.npcId==='the_conductor')options.push('oubli');
 if((save?.beacons?.length||0)>0||completed)options.push('memory');
 if((save?.seals?.length||0)>0||weather!=='clear'||hour>=20||hour<6)options.push('opinion');
 options.push('goodbye');
 return [...new Set(options)].map(id=>({id,label:HUB_DIALOGUE_INTENTS[id].label}));
}

export function hubDialogueIntentResponse(item,intentId,save,{hour=12,weather='clear',guardianName=null,value=null,countryName=null}={}){
 const missions=save?.hub?.missions||{},active=activeMission(item,missions),completed=completedMission(item,missions),name=item.name||'Cette personne',district=item.district||'ce quartier';
 switch(intentId){
  case 'identity':return {text:`${name}. ${item.role||'Habitant du Monde 3B'}. Je vis ici ; ce que je sais vient surtout de ce que j’ai vu, pas de ce que la ville raconte sur elle-même.`};
  case 'district':return {text:`Ici, ${district} change selon l’heure, les habitants et ce qui a déjà été restauré. Regarde aussi les détails : tout ce qui compte n’a pas forcément un marqueur.`};
  case 'mission':
   return active?{text:`Tu m’aides déjà. Termine d’abord l’étape ${active[1].completedObjectives+1} sur ${active[1].totalObjectives}.`}:completed?{text:'Tu as déjà fait ce que je t’avais demandé. Regarde maintenant ce que cette action a changé autour de nous.'}:{text:(item.missionIds||[]).length?'Oui. Une mission est liée à ce lieu ; commence-la depuis son point dans la Cité.':'Pas pour l’instant. Mais les événements du quartier peuvent encore créer de nouvelles situations.'};
  case 'guardian':return {text:guardianName?`${guardianName} ne protège pas simplement ${value||'une valeur'}. Son épreuve vient de sa propre difficulté à vivre cette valeur. Si tu veux le comprendre, observe ce qu’il refuse de faire autant que ce qu’il fait.`:`Le Gardien lié à ${countryName||'ce territoire'} ne se résume pas à un combat. Les habitants, les Souvenirs et l’état du quartier te diront pourquoi il est devenu Gardien.`};
  case 'oubli':return {text:'L’Oubli préfère les choses séparées : un souvenir sans contexte, une valeur sans personne, une histoire sans transmission. Quand tout devient isolé, il peut remplacer le sens par une version plus simple.'};
  case 'clue':{
   if(!active)return {text:'Je n’ai pas d’indice utile pour toi maintenant.'};
   const n=Math.min(active[1].completedObjectives+1,active[1].totalObjectives);
   return {text:`Pour l’étape ${n}, cherche une action réelle dans le monde. Si l’objectif parle de transport, de personne, de bâtiment ou de secret, le simple fait d’ouvrir le journal ne suffira pas.`};
  }
  case 'memory':return {text:(save?.beacons?.length||0)>0?'Depuis que les Souvenirs reviennent, certaines personnes se rappellent des détails différents. Ne cherche pas une seule version parfaite : compare ce qui revient chez plusieurs témoins.':'Avant, j’ai surtout des impressions : des lieux plus pleins, des noms mieux ancrés. Les vrais Souvenirs diront davantage que ma nostalgie.'};
  case 'opinion':return {text:weather==='storm'||weather==='heavy_rain'?'La ville change sous cette météo. Certains restent à l’abri, d’autres sont appelés dehors : regarde qui bouge et qui disparaît.':hour>=20||hour<6?'La nuit révèle d’autres habitudes. Les transports, les secrets et même les conversations ne sont pas les mêmes.':'Depuis les premières restaurations, la Cité paraît plus vivante. Mais ce sont surtout les comportements des habitants qui me le font sentir.'};
  case 'goodbye':return {text:'À bientôt. Reviens après avoir fait quelque chose dans le monde ; j’aurai peut-être autre chose à te dire.',close:true};
  default:return {text:'Je n’ai rien de fiable à ajouter là-dessus.'};
 }
}
