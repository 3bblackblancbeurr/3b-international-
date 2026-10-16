export const CIRCLE_VALUES=Object.freeze([
 {id:'justice',name:'Justice',country:'France',guardian:'Céliane',quest:'Faire une action juste ou rendre service à quelqu’un.',route:'community'},
 {id:'loyaute',name:'Loyauté',country:'Algérie',guardian:'Yliane',quest:'Prendre des nouvelles d’une personne importante.',route:'community'},
 {id:'noblesse',name:'Noblesse',country:'Maroc',guardian:'Naël',quest:'Transmettre une connaissance ou un geste utile.',route:'manga'},
 {id:'courage',name:'Courage',country:'Tunisie',guardian:'Soraya',quest:'Essayer une activité nouvelle à ton rythme.',route:'sport'},
 {id:'passion',name:'Passion',country:'Espagne',guardian:'Diego',quest:'Prendre du temps pour une création personnelle.',route:'ia-textile'},
 {id:'espoir',name:'Espoir',country:'Italie',guardian:'Alessio',quest:'Faire un petit pas concret vers un projet.',route:'guide'},
 {id:'foi',name:'Foi',country:'Turquie',guardian:'Émir',quest:'Consacrer un moment à tes valeurs ou à la réflexion, selon tes convictions.',route:'religion'},
 {id:'sagesse',name:'Sagesse',country:'Estonie',guardian:'Eira',quest:'Apprendre et partager quelque chose de nouveau.',route:'religion'}
]);
export const NOW_SECTIONS=Object.freeze([
 {id:'boussole',name:'Boussole',detail:'Trouver une action'},
 {id:'cercle',name:'Cercle vivant',detail:'8 valeurs'},
 {id:'aide',name:'Coup de Main',detail:'Agir ensemble'},
 {id:'scanner',name:'Scanner utile',detail:'Lire et comprendre'},
 {id:'heritage',name:'Héritage',detail:'Préserver'},
 {id:'universel',name:'Universel',detail:'Adapter 3B'}
]);
export const LIFE_GOALS=Object.freeze([
 {id:'bouger',name:'Bouger',route:'health',heading:'Prends soin de toi',description:'Une activité accessible, sans performance imposée.',steps:['Choisis une petite activité qui te convient.','Ouvre Santé 3B pour consulter tes outils.','À la fin, note simplement ce que tu as fait.']},
 {id:'decouvrir',name:'Découvrir',route:'religion',heading:'Une découverte à ton rythme',description:'Explore une histoire ou une culture sans obligation.',steps:['Choisis une question que tu aimerais comprendre.','Explore les contenus culturels et leurs sources.','Retiens une découverte qui t’a marqué.']},
 {id:'creer',name:'Créer',route:'ia',heading:'Transforme ton idée en projet',description:'Un petit début vaut mieux qu’un grand projet oublié.',steps:['Choisis un objet ou un concept à imaginer.','Teste les outils de création 3B.','Enregistre ou exporte ton idée.']},
 {id:'partager',name:'Partager',route:'community',heading:'Une action pour le collectif',description:'Échanger et contribuer sans exposer tes données personnelles.',steps:['Pense à une compétence que tu peux partager.','Découvre la Communauté 3B et ses règles.','Propose ton idée uniquement si tu souhaites la publier.']},
 {id:'jouer',name:'Jouer',route:'games',heading:'Un défi pour le plaisir',description:'Explore les jeux 3B et choisis ton rythme.',steps:['Choisis un jeu parmi ceux déjà disponibles.','Joue une partie sans pression.','Reviens à la Boussole pour noter ton expérience.']},
 {id:'economiser',name:'Découvrir un bon plan',route:'deals',heading:'Cherche une solution utile',description:'Consulte des offres sourcées, sans achat obligatoire.',steps:['Identifie ce dont tu as réellement besoin.','Compare la date, les conditions et les sources des bons plans.','Ne choisis une offre que si elle te convient.']}
]);
export const DURATIONS=Object.freeze([15,30,60]);
export function dayKey(date=new Date()){
 const d=date instanceof Date?date:new Date(date);
 if(Number.isNaN(d.getTime()))return dayKey(new Date());
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
export function planFor(goal='bouger',duration=30){
 const item=LIFE_GOALS.find(x=>x.id===goal)||LIFE_GOALS[0];
 const minutes=DURATIONS.includes(Number(duration))?Number(duration):30;
 return {...item,minutes,firstStep:minutes===15?'Commence par 5 minutes, puis ajuste librement.':minutes===30?'Accorde-toi quelques minutes pour te préparer.':'Fais une pause lorsque tu en ressens le besoin.'};
}
export function normalizeDailyProgress(raw,day=dayKey()){
 const valid=new Set(CIRCLE_VALUES.map(x=>x.id));
 const completed=Array.isArray(raw?.completed)?[...new Set(raw.completed.filter(x=>valid.has(x)))]:[];
 const date=raw?.date===day?day:String(day);
 return {date,completed:raw?.date===day?completed:[],goal:LIFE_GOALS.some(x=>x.id===raw?.goal)?raw.goal:'bouger',duration:DURATIONS.includes(Number(raw?.duration))?Number(raw.duration):30,planDone:raw?.date===day&&raw?.planDone===true};
}
export function progressPercent(completed=[]){return Math.round(Math.min(8,new Set(completed.filter(x=>CIRCLE_VALUES.some(v=>v.id===x))).size)/8*100);}
export function nowStorageKey(uid){return '3b-now-progress-v1-'+(typeof uid==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(uid)?uid:'visiteur');}
export function loadNowProgress(uid,storage,day=dayKey()){
 try{return normalizeDailyProgress(JSON.parse(storage.getItem(nowStorageKey(uid))||'null'),day)}
 catch{return normalizeDailyProgress(null,day)}
}
export function saveNowProgress(uid,data,storage,day=dayKey()){
 const clean=normalizeDailyProgress({...data,date:day},day);
 try{storage.setItem(nowStorageKey(uid),JSON.stringify(clean));return true}catch{return false}
}
