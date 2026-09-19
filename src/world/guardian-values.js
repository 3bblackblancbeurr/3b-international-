export const GUARDIAN_VALUES={
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

export function blankGuardianValueState(){return {step:0,completed:false,choices:[]};}
export function normalizeGuardianValueState(region,input){
 const rule=GUARDIAN_VALUES[region],base=blankGuardianValueState();if(!rule||!input)return base;
 const choices=Array.isArray(input.choices)?input.choices.filter((id,i)=>rule.choices[i]?.[0]===id).slice(0,3):[];
 return {step:choices.length,completed:choices.length===3,choices};
}
export function guardianValueStep(region,state){
 const rule=GUARDIAN_VALUES[region],step=state?.step||0;if(!rule||step>=3)return null;
 const [id,label]=rule.choices[step];return {id,label,step,value:rule.value,name:rule.name};
}
export function guardianValueOptions(region,state){
 const current=guardianValueStep(region,state);if(!current)return[];
 const decoys=[
  {id:'raccourci',label:'Prendre le raccourci le plus avantageux'},
  {id:'ignorer',label:'Ignorer ce qui complique la décision'},
 ];
 const options=[{id:current.id,label:current.label,correct:true},...decoys];
 const rotate=(region.length+current.step)%options.length;
 return [...options.slice(rotate),...options.slice(0,rotate)];
}
export function guardianHubPresence(seals=[],restoredRegions=[]){
 return Object.entries(GUARDIAN_VALUES).filter(([region])=>seals.includes(region)&&restoredRegions.includes(region)).map(([region,data])=>({region,...data}));
}
