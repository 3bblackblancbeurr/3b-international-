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
  return [region,{...data,question:narrative?.question||'',missionStyle:narrative?.missionStyle||'',flaw:narrative?.guardian?.flaw||'',evolution:narrative?.guardian?.evolution||'',campaign:narrative?.campaign||[]}];
 })
);

const VALUE_TENSIONS={
 france:[
  ['vite','Décider vite pour calmer la foule, même si un doute subsiste'],
  ['camp','Choisir le camp qui paraît le plus crédible sans vérifier le reste'],
 ],
 italie:[
  ['nier','Faire comme si rien n’était perdu pour préserver le moral'],
  ['attendre','Attendre que la situation s’améliore d’elle-même'],
 ],
 estonie:[
  ['analyser','Continuer à analyser jusqu’à ne plus prendre de décision'],
  ['savoir','Garder l’information pour soi afin d’éviter toute erreur'],
 ],
 turquie:[
  ['certitude','Prétendre ne jamais douter pour paraître plus solide'],
  ['signe','Refuser d’agir tant qu’un signe parfait n’apparaît pas'],
 ],
 algerie:[
  ['couvrir','Couvrir un proche même lorsqu’il fait du tort aux autres'],
  ['rompre','Rompre immédiatement le lien dès la première faute'],
 ],
 tunisie:[
  ['masquer','Cacher sa peur et partir seul pour ne montrer aucune faiblesse'],
  ['fuir','Éviter toute situation où l’issue n’est pas garantie'],
 ],
 maroc:[
  ['rang','Faire respecter son rang avant d’écouter les autres'],
  ['donner-haut','Aider seulement si l’autre reconnaît une dette'],
 ],
 espagne:[
  ['foncer','Agir immédiatement parce que l’intensité semble sincère'],
  ['bruler','Détruire ce qui bloque plutôt que transformer l’énergie'],
 ],
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
 const tensions=VALUE_TENSIONS[region]||[['raccourci','Prendre le raccourci le plus avantageux'],['ignorer','Ignorer ce qui complique la décision']];
 const decoys=tensions.map(([id,label])=>({id,label}));
 const options=[{id:current.id,label:current.label,correct:true},...decoys];
 const rotate=(region.length+current.step)%options.length;
 return [...options.slice(rotate),...options.slice(0,rotate)];
}
export function guardianHubPresence(seals=[],restoredRegions=[]){
 return Object.entries(GUARDIAN_VALUES).filter(([region])=>seals.includes(region)&&restoredRegions.includes(region)).map(([region,data])=>({region,...data}));
}
