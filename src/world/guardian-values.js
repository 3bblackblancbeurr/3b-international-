import {COUNTRY_NARRATIVE} from './narrative-canon.js';

const CORE_GUARDIAN_VALUES={
 france:{card:'C165',name:'Céliane',value:'Justice',district:'archives',choices:[
  ['écouter','Écouter les deux versions avant de décider'],
  ['preuve','Chercher ce qui peut être vérifié'],
  ['réparer','Choisir une réparation proportionnée'],
 ]},
 italie:{card:'C166',name:'Alessio',value:'Espoir',district:'gardens',choices:[
  ['tenir','Continuer malgré l’échec'],['ouvrir','Créer une nouvelle possibilité'],['transmettre','Aider quelqu’un à continuer'],
 ]},
 estonie:{card:'C167',name:'Eira',value:'Sagesse',district:'gardens',choices:[
  ['observer','Observer avant d’agir'],['relier','Relier les indices'],['mesurer','Choisir avec recul'],
 ]},
 turquie:{card:'C168',name:'Émir',value:'Foi',district:'innovation',choices:[
  ['tenir','Rester fidèle à sa parole'],['douter','Accepter la question'],['agir','Agir avec cohérence'],
 ]},
 algerie:{card:'C169',name:'Yliane',value:'Loyauté',district:'docks',choices:[
  ['rester','Ne pas abandonner les siens'],['dire','Dire la vérité même difficile'],['protéger','Protéger sans enfermer'],
 ]},
 tunisie:{card:'C170',name:'Soraya',value:'Courage',district:'community',choices:[
  ['avancer','Avancer malgré la peur'],['protéger','Intervenir pour protéger'],['assumer','Assumer les conséquences'],
 ]},
 maroc:{card:'C171',name:'Naël',value:'Noblesse',district:'commerce',choices:[
  ['respecter','Respecter même sans avantage'],['donner','Donner sans humilier'],['tenir','Tenir sa parole'],
 ]},
 espagne:{card:'C172',name:'Diego',value:'Passion',district:'arena',choices:[
  ['canaliser','Canaliser l’intensité'],['créer','Transformer l’émotion en création'],['maîtriser','Rester maître de son geste'],
 ]},
};

export const GUARDIAN_VALUES=Object.fromEntries(
 Object.entries(CORE_GUARDIAN_VALUES).map(([region,data])=>{
  const narrative=COUNTRY_NARRATIVE[region];
  return [region,{
   ...data,
   question:narrative?.question||'',
   missionStyle:narrative?.missionStyle||'',
   flaw:narrative?.guardian?.flaw||'',
   evolution:narrative?.guardian?.evolution||'',
   campaign:narrative?.campaign||[],
  }];
 })
);

export const GUARDIAN_VALUE_SCENES={
 france:[
  {prompt:'Deux habitants donnent des versions opposées du même incident. Aucun témoin n’a encore été entendu.',decoys:[['trancher','Décider immédiatement d’après la première version'],['majorité','Suivre l’avis du groupe sans entendre l’autre personne']]},
  {prompt:'Les deux récits restent contradictoires, mais des traces et des archives peuvent encore être consultées.',decoys:[['rumeur','Prendre la rumeur la plus répétée pour une preuve'],['intuition','Se fier uniquement à son intuition']]},
  {prompt:'La responsabilité est établie. Il faut maintenant réparer le tort sans créer une nouvelle injustice.',decoys:[['punir','Punir le plus sévèrement possible, quel que soit le dommage'],['effacer','Ne rien faire pour éviter un nouveau conflit']]},
 ],
 algerie:[
  {prompt:'Un membre du groupe veut partir au moment où les autres ont besoin de lui, mais rester lui coûte quelque chose.',decoys:[['abandonner','Partir sans prévenir pour protéger son propre intérêt'],['promettre','Promettre de rester puis disparaître au premier risque']]},
  {prompt:'Une vérité difficile peut blesser un proche, mais la cacher risque de briser la confiance plus tard.',decoys:[['cacher','Cacher la vérité pour préserver le calme immédiat'],['accuser','Dire seulement ce qui rejette la faute sur quelqu’un d’autre']]},
  {prompt:'Quelqu’un que tu protèges veut faire son propre choix. Le danger existe, mais le contrôler détruirait sa confiance.',decoys:[['enfermer','Décider à sa place pour être certain de le garder près de toi'],['laisser','L’abandonner complètement sous prétexte de liberté']]},
 ],
 maroc:[
  {prompt:'Tu peux gagner un avantage en humiliant quelqu’un qui ne peut pas te répondre.',decoys:[['profiter','Profiter de sa faiblesse tant que personne ne regarde'],['mépriser','L’aider seulement s’il reconnaît ta supériorité']]},
  {prompt:'Une personne a besoin d’aide mais refuse d’être traitée comme inférieure.',decoys:[['exposer','L’aider publiquement pour recevoir les félicitations'],['conditionner','Donner seulement si elle accepte une dette envers toi']]},
  {prompt:'Tenir ta parole devient plus difficile que prévu et personne ne pourrait vérifier si tu renonces.',decoys:[['excuse','Changer discrètement les termes de ta promesse'],['oublier','Faire comme si la parole donnée n’avait jamais existé']]},
 ],
 tunisie:[
  {prompt:'Tu as peur, mais une personne est encore de l’autre côté du danger.',decoys:[['fuir','Attendre que quelqu’un d’autre prenne tous les risques'],['foncer','Foncer sans regarder le danger ni préparer une issue']]},
  {prompt:'Une personne est menacée devant toi. Intervenir comporte un risque réel.',decoys:[['observer','Rester spectateur en espérant que cela s’arrête seul'],['vengeance','Répondre avec plus de violence que nécessaire']]},
  {prompt:'Ton choix courageux a eu une conséquence imprévue.',decoys:[['nier','Nier ton rôle pour protéger ton image'],['rejeter','Faire porter toute la responsabilité à quelqu’un d’autre']]},
 ],
 espagne:[
  {prompt:'L’émotion monte et peut donner de la force à ton action ou te faire perdre le contrôle.',decoys:[['exploser','Laisser l’émotion décider de chaque geste'],['eteindre','Refuser toute émotion pour ne prendre aucun risque']]},
  {prompt:'Une colère forte peut devenir destruction ou création.',decoys:[['casser','Détruire ce qui se trouve devant toi pour te soulager'],['retenir','Garder toute l’émotion jusqu’à ce qu’elle devienne rancœur']]},
  {prompt:'La foule t’encourage à aller plus loin alors que tu sens que tu approches de ta limite.',decoys:[['prouver','Continuer seulement pour prouver quelque chose au public'],['abandonner','Quitter dès que l’intensité devient inconfortable']]},
 ],
 italie:[
  {prompt:'Une première tentative a échoué et tout le monde pense que le projet est terminé.',decoys:[['renoncer','Conclure que l’échec prouve que rien ne peut changer'],['pretendre','Faire semblant que rien n’a échoué et recommencer pareil']]},
  {prompt:'L’ancien chemin est fermé. Il faut décider s’il existe encore une autre manière d’avancer.',decoys:[['attendre','Attendre indéfiniment que l’ancien chemin se rouvre'],['forcer','Forcer exactement la même solution malgré les mêmes obstacles']]},
  {prompt:'Quelqu’un près de toi commence à perdre espoir après plusieurs échecs.',decoys:[['minimiser','Lui dire que ses difficultés ne comptent pas'],['promettre','Lui garantir un succès que tu ne peux pas assurer']]},
 ],
 turquie:[
  {prompt:'Personne ne peut vérifier immédiatement ta promesse, mais d’autres comptent dessus.',decoys:[['adapter','Changer ta parole dès qu’elle devient coûteuse'],['apparence','Respecter seulement ce qui peut être vu par les autres']]},
  {prompt:'Une question sérieuse remet en cause ce que tu pensais savoir.',decoys:[['refuser','Refuser toute question pour ne jamais douter'],['toutnier','Conclure que le doute rend toute conviction inutile']]},
  {prompt:'Tu ne possèdes pas toutes les réponses, mais une action cohérente est nécessaire maintenant.',decoys:[['attendre','Refuser d’agir tant qu’aucune certitude absolue n’existe'],['hasard','Choisir au hasard puis appeler cela une conviction']]},
 ],
 estonie:[
  {prompt:'Un phénomène inhabituel apparaît, mais tu ne disposes encore que de quelques indices.',decoys:[['agirvite','Agir immédiatement avant même d’observer'],['ignorer','Ignorer le phénomène parce qu’il est difficile à comprendre']]},
  {prompt:'Plusieurs indices semblent séparés mais certains détails se répètent.',decoys:[['isoler','Étudier chaque indice comme s’il n’avait aucun lien avec les autres'],['choisir','Garder seulement l’indice qui confirme ta première idée']]},
  {prompt:'Tu comprends enfin le problème, mais agir trop tôt ou trop tard peut aggraver la situation.',decoys:[['precipiter','Agir dès la première occasion sans mesurer les conséquences'],['neplusagir','Continuer à analyser jusqu’à ne jamais prendre de décision']]},
 ],
};

export const GUARDIAN_VALUE_REFLECTIONS=Object.freeze([
 {id:'reparer_consequence',label:'Réparer concrètement ce que mon choix a abîmé',mode:'repair'},
 {id:'assumer_devant_les_autres',label:'Assumer mon choix devant les personnes touchées',mode:'accountability'},
 {id:'demander_comment_avancer',label:'Demander aux personnes concernées comment avancer ensemble',mode:'dialogue'},
]);

const sceneOptionIds=(region,step)=>{
 const aligned=GUARDIAN_VALUES[region]?.choices?.[step]?.[0],decoys=GUARDIAN_VALUE_SCENES[region]?.[step]?.decoys||[];
 return [aligned,...decoys.map(([id])=>id)].filter(Boolean);
};

export function blankGuardianValueState(){return {step:0,completed:false,choices:[],decisions:[],alignment:0,tensions:[],reflectionNeeded:false,reflection:null};}

export function normalizeGuardianValueState(region,input){
 const rule=GUARDIAN_VALUES[region],base=blankGuardianValueState();if(!rule||!input)return base;
 let decisions=Array.isArray(input.decisions)?input.decisions.filter((id,index)=>sceneOptionIds(region,index).includes(id)).slice(0,3):[];
 if(!decisions.length&&Array.isArray(input.choices))decisions=input.choices.filter((id,index)=>sceneOptionIds(region,index).includes(id)).slice(0,3);
 const alignment=decisions.reduce((total,id,index)=>total+(rule.choices[index]?.[0]===id?1:0),0);
 const choices=decisions.filter((id,index)=>rule.choices[index]?.[0]===id);
 const tensions=decisions.map((id,index)=>rule.choices[index]?.[0]===id?null:`step:${index+1}:${id}`).filter(Boolean);
 const rawReflection=input.reflection&&GUARDIAN_VALUE_REFLECTIONS.some(option=>option.id===input.reflection)?input.reflection:null;
 const reflectionNeeded=decisions.length===3&&alignment<2&&!rawReflection;
 const completed=decisions.length===3&&(alignment>=2||!!rawReflection);
 return {step:decisions.length,completed,choices,decisions,alignment,tensions,reflectionNeeded,reflection:rawReflection};
}

export function guardianValueStep(region,state){
 const rule=GUARDIAN_VALUES[region],normalized=normalizeGuardianValueState(region,state);if(!rule)return null;
 if(normalized.reflectionNeeded)return {
  id:'reflection',step:3,value:rule.value,name:rule.name,reflection:true,
  prompt:`Tes décisions ont créé plusieurs tensions autour de ${rule.value}. Il ne s’agit pas de recommencer le QCM : choisis comment tu assumes maintenant leurs conséquences.`,
  label:'Assumer les conséquences',
 };
 if(normalized.completed||normalized.step>=3)return null;
 const step=normalized.step,[id,label]=rule.choices[step],scene=GUARDIAN_VALUE_SCENES[region]?.[step];
 return {id,label,step,value:rule.value,name:rule.name,prompt:scene?.prompt||`Choisis comment agir face à cette situation de ${rule.value}.`,reflection:false};
}

export function guardianValueOptions(region,state){
 const current=guardianValueStep(region,state);if(!current)return[];
 if(current.reflection)return GUARDIAN_VALUE_REFLECTIONS.map(option=>({...option,stance:'reflection',consequence:'Cette réponse reconnaît les conséquences au lieu d’effacer le choix précédent.'}));
 const rule=GUARDIAN_VALUES[region],scene=GUARDIAN_VALUE_SCENES[region]?.[current.step],aligned=rule.choices[current.step];
 const alternatives=(scene?.decoys||[
  ['raccourci','Choisir la solution la plus facile sans examiner ses conséquences'],
  ['ignorer','Éviter la décision pour ne pas assumer son résultat'],
 ]).map(([id,label])=>({id,label,stance:'tension',consequence:`Ce choix crée une tension avec ${rule.value} ; le monde et le Gardien pourront s’en souvenir.`}));
 const options=[{id:aligned[0],label:aligned[1],stance:'aligned',consequence:`Ce choix est fortement cohérent avec ${rule.value}, sans garantir qu’il soit sans coût.`},...alternatives];
 const rotate=(region.length+current.step)%options.length;
 return [...options.slice(rotate),...options.slice(0,rotate)];
}

export function guardianValueDecision(region,state,choiceId){
 const current=normalizeGuardianValueState(region,state),step=guardianValueStep(region,current),options=guardianValueOptions(region,current);
 if(!step)return {ok:false,state:current,reason:'complete'};
 const option=options.find(item=>item.id===choiceId);if(!option)return {ok:false,state:current,reason:'unknown-choice'};
 if(step.reflection){
  return {ok:true,option,state:normalizeGuardianValueState(region,{...current,reflection:choiceId})};
 }
 const decisions=[...current.decisions,choiceId];
 return {ok:true,option,state:normalizeGuardianValueState(region,{...current,decisions})};
}

export function guardianValueOutcome(region,state){
 const rule=GUARDIAN_VALUES[region],s=normalizeGuardianValueState(region,state);if(!rule)return null;
 return {
  value:rule.value,
  guardian:rule.name,
  alignment:s.alignment,
  tensions:s.tensions.length,
  reflection:s.reflection,
  completed:s.completed,
  summary:s.completed?(s.reflection?`${rule.name} reconnaît que tu as su assumer les conséquences de tes choix.`:`${rule.name} reconnaît une compréhension cohérente de ${rule.value}.`):s.reflectionNeeded?`Tes choix demandent maintenant une réflexion sur leurs conséquences.`:`${s.step}/3 décisions traversées.`,
 };
}

export function guardianHubPresence(seals=[],restoredRegions=[]){
 return Object.entries(GUARDIAN_VALUES).filter(([region])=>seals.includes(region)&&restoredRegions.includes(region)).map(([region,data])=>({region,...data}));
}
