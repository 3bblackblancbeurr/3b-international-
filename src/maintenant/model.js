// 3B Maintenant — no remote collection, no artificial XP, no inferred proof of altruism.
export const JOURNEY_STORAGE_KEY = 'threeb_now_journey_v1';
export const READ_STORAGE_KEY = 'threeb_now_read_v1';

export const EXPERIENCES = Object.freeze([
  { id:'boussole', label:'Boussole 3B', short:'Ma journée', description:'Un cap concret, selon ton temps.', symbol:'compass' },
  { id:'cercle', label:'Cercle Vivant', short:'Mes valeurs', description:'Huit héritages pour avancer.', symbol:'orbit' },
  { id:'coup', label:'Coup de Main', short:'S’entraider', description:'Des actions simples pour les autres.', symbol:'hands' },
  { id:'scanner', label:'Scanner utile', short:'Comprendre', description:'Lire un code ou ouvrir ton scanner.', symbol:'scan' },
  { id:'heritage', label:'Héritage 3B', short:'Transmettre', description:'Des souvenirs dans un coffre privé.', symbol:'book' },
  { id:'universel', label:'Mode universel', short:'À ma façon', description:'Des outils de lecture et d’accessibilité.', symbol:'access' },
]);

export const VALUES = Object.freeze([
  {id:'justice',name:'Justice',country:'France',guardian:'Céliane',question:'Quel geste juste peux-tu poser aujourd’hui ?',idea:'Écouter deux points de vue avant de juger.',route:'world3b'},
  {id:'loyaute',name:'Loyauté',country:'Algérie',guardian:'Yliane',question:'À qui aimerais-tu tenir une promesse ?',idea:'Prendre des nouvelles avec sincérité.',route:'world3b'},
  {id:'noblesse',name:'Noblesse',country:'Maroc',guardian:'Naël',question:'Comment aider sans rien attendre ?',idea:'Faire un geste discret et désintéressé.',route:'world3b'},
  {id:'courage',name:'Courage',country:'Tunisie',guardian:'Soraya',question:'Quelle petite peur pourrais-tu dépasser ?',idea:'Essayer une chose nouvelle à ton rythme.',route:'world3b'},
  {id:'passion',name:'Passion',country:'Espagne',guardian:'Diego',question:'Qu’est-ce qui te donne vraiment de l’élan ?',idea:'Consacrer du temps à une activité aimée.',route:'world3b'},
  {id:'espoir',name:'Espoir',country:'Italie',guardian:'Alessio',question:'Quel petit progrès te donnerait de l’espoir ?',idea:'Imaginer une étape atteignable pour demain.',route:'world3b'},
  {id:'foi',name:'Foi',country:'Turquie',guardian:'Émir',question:'Sur quoi trouves-tu la force de tenir ?',idea:'Respecter les croyances et convictions de chacun.',route:'religion'},
  {id:'sagesse',name:'Sagesse',country:'Estonie',guardian:'Eira',question:'Quelle leçon aimerais-tu transmettre ?',idea:'Partager un savoir en restant ouvert à apprendre.',route:'world3b'},
]);

export const GOALS = Object.freeze([
  {id:'bouger',label:'Bouger',subtitle:'Prendre soin de soi',route:'health',
    steps:[{title:'Un départ doux',detail:'Prépare une marche, quelques étirements ou une activité adaptée à tes capacités.'},{title:'Passe à l’action',detail:'Pratique à ton rythme, sans te forcer ni poursuivre un objectif médical.'},{title:'Retrouve tes outils',detail:'Ouvre Santé 3B pour consulter tes activités et tes repères personnels.'}]},
  {id:'apprendre',label:'Apprendre',subtitle:'Découvrir une autre perspective',route:'religion',
    steps:[{title:'Choisis une question',detail:'Une histoire, une tradition, une langue ou une idée qui t’intrigue.'},{title:'Découvre les sources',detail:'Privilégie les explications nuancées et vérifie les faits.'},{title:'Continue dans 3B',detail:'Ouvre Religion 3B pour explorer les cultures et les traditions.'}]},
  {id:'aider',label:'Aider',subtitle:'Faire quelque chose de positif',route:'community',
    steps:[{title:'Imagine un geste simple',detail:'Écouter, encourager ou proposer une aide réalisable sans contrepartie.'},{title:'Protège les personnes',detail:'Ne partage pas de coordonnées ou d’informations sensibles publiquement.'},{title:'Rejoins le collectif',detail:'Découvre la Communauté 3B avant de proposer une initiative.'}]},
  {id:'explorer',label:'Explorer',subtitle:'Voyager dans les huit héritages',route:'world3b',
    steps:[{title:'Choisis une valeur',detail:'Justice, loyauté, noblesse, courage, passion, espoir, foi ou sagesse.'},{title:'Entre dans l’histoire',detail:'Découvre Kaïs, les huit gardiens et la Cité des Héritages.'},{title:'Poursuis ton parcours',detail:'Accède au Monde du 3B depuis ton Passeport si nécessaire.'}]},
  {id:'creer',label:'Créer',subtitle:'Transformer une idée en projet',route:'ia',
    steps:[{title:'Trouve une intention',detail:'Imagine une tenue, un objet ou une création qui a du sens.'},{title:'Choisis les détails',detail:'Travaille les couleurs, les matières et les finitions.'},{title:'Passe dans l’atelier',detail:'Utilise les outils textile & IA 3B disponibles.'}]},
  {id:'jouer',label:'Jouer',subtitle:'S’évader et relever un défi',route:'games',
    steps:[{title:'Choisis ton aventure',detail:'Football, ville, plateau, labyrinthes ou stratégie.'},{title:'Une partie à ton rythme',detail:'La victoire et le score ne mesurent pas ta valeur personnelle.'},{title:'Rejoins les jeux',detail:'Entre dans Jeux 3B et retrouve ta progression existante.'}]},
]);

export const HELP_IDEAS = Object.freeze([
 {id:'ecouter',title:'Offrir une écoute',detail:'Prendre des nouvelles ou laisser quelqu’un raconter son histoire.',tip:'Ne cherche pas à publier des récits personnels sans accord.'},
 {id:'transmettre',title:'Partager un savoir',detail:'Expliquer une compétence, une langue ou une méthode.',tip:'Fixe un cadre clair et respecte les limites de chacun.'},
 {id:'participer',title:'Participer localement',detail:'Repérer une association fiable ou une initiative publique.',tip:'Vérifie l’organisateur et le lieu avant toute rencontre.'},
]);

export const MINUTES = Object.freeze([15,30,60]);
export const INTENSITIES = Object.freeze([
 {id:'calme',label:'À mon rythme'}, {id:'normal',label:'Équilibré'}, {id:'dynamique',label:'De l’énergie'},
]);
export const TIME_LABEL = Object.freeze({15:'15 minutes',30:'30 minutes',60:'1 heure'});

export function normalizeJourney(value) {
 const candidate=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const goal=GOALS.some(g=>g.id===candidate.goal)?candidate.goal:'bouger';
 const minutes=MINUTES.includes(candidate.minutes)?candidate.minutes:30;
 const intensity=INTENSITIES.some(t=>t.id===candidate.intensity)?candidate.intensity:'normal';
 const raw=candidate.values&&typeof candidate.values==='object'&&!Array.isArray(candidate.values)?candidate.values:{};
 const values=Object.fromEntries(VALUES.map(x=>[x.id,raw[x.id]===true]));
 return {version:1,goal,minutes,intensity,values};
}

export function normalizeReadMode(value) {
 const candidate=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 return {large: candidate.large===true, contrast:candidate.contrast===true, calm:candidate.calm===true};
}

export function journeyFor(value) {
 const p=normalizeJourney(value);
 const goal=GOALS.find(x=>x.id===p.goal)||GOALS[0];
 const pace=p.intensity==='calme'?'sans pression':p.intensity==='dynamique'?'avec un peu d’élan':'à ton rythme';
 return {...goal,minutes:p.minutes,pace,steps:goal.steps.map((s,i)=>({...s,index:i+1}))};
}

export function circleProgress(value) {
 const prefs=normalizeJourney(value);
 return VALUES.filter(x=>prefs.values[x.id]).length;
}

export function safeParseStorage(storage,key,normalize) {
 try{return normalize(JSON.parse(storage.getItem(key)||'null'));}
 catch{return normalize(null);}
}

export function safeWriteStorage(storage,key,value) {
 try{storage.setItem(key,JSON.stringify(value));return true;}
 catch{return false;}
}

export function nextValueState(prefs,id) {
 if(!VALUES.some(v=>v.id===id))return normalizeJourney(prefs);
 const previous=normalizeJourney(prefs);
 return {...previous,values:{...previous.values,[id]:!previous.values[id]}};
}
