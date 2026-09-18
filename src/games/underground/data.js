export const GAME_ID='underground';
export const SAVE_VERSION=2;

export const TIER_THRESHOLDS=[0,1000,2500,4500,6500,8000,10000];
export const TIERS=[
  {id:1,name:'Inconnu',min:0},
  {id:2,name:'Pilote local',min:1000},
  {id:3,name:'Reconnu',min:2500},
  {id:4,name:'Challenger',min:4500},
  {id:5,name:'Élite',min:6500},
  {id:6,name:'Prétendant',min:8000},
  {id:7,name:'Gardien',min:10000},
];

export const VEHICLE_CLASSES=[
  {id:'D',min:100,max:249},
  {id:'C',min:250,max:399},
  {id:'B',min:400,max:549},
  {id:'A',min:550,max:699},
  {id:'S',min:700,max:849},
  {id:'X',min:850,max:999},
];

export const DISCIPLINES={
  rush:{id:'rush',name:'Rush',description:'Point A vers point B. Vitesse, trafic et choix de trajectoire.',baseMinutes:2.4},
  circuit:{id:'circuit',name:'Cercle',description:'Plusieurs tours, régularité et dépassements.',baseMinutes:3.4},
  flow:{id:'flow',name:'Flow 3B',description:'Drift, angle, vitesse et enchaînements propres.',baseMinutes:2.2},
  redline:{id:'redline',name:'Ligne Rouge',description:'Départ, passages de rapports et accélération pure.',baseMinutes:1.0},
  duel:{id:'duel',name:'Duel Sauvage',description:'Affronte un rival rencontré dans le monde ouvert.',baseMinutes:2.8},
  chrono:{id:'chrono',name:'Chrono',description:'Trajectoire parfaite contre le temps.',baseMinutes:2.0},
  convoy:{id:'convoy',name:'Convoi',description:'Course d’équipe. Ta place seule ne suffit pas.',baseMinutes:3.3},
  endurance:{id:'endurance',name:'Endurance',description:'Longue distance, constance et gestion.',baseMinutes:5.6},
  nexus:{id:'nexus',name:'Épreuve Nexus',description:'Règles spéciales liées au Cercle Brisé.',baseMinutes:4.1},
};

const routes=(prefix,labels)=>labels.map((name,index)=>({id:`${prefix}-r${index+1}`,name,distanceKm:4.5+index*1.15,technical:0.35+((index*17)%45)/100,traffic:0.25+((index*13)%50)/100}));

export const COUNTRIES=[
  {
    id:'france',order:0,name:'France',code:'FR',guardian:'Céliane',value:'Justice',accent:'#286cff',
    unlock:{fragments:0,requires:[]},weather:['pluie','sec','brume'],
    identity:'Boulevards mouillés, quais, tunnels, rocades et routes alpines.',
    routes:routes('fr',['Quais de Justice','Tunnel des Lumières','Boucle Métropole','Rocade du Cercle','Montée des Alpes','Ponts de Minuit','Axe Héritage','Dernière Balance']),
    bossRule:'Régularité absolue : tes trois secteurs doivent rester équilibrés.',
    stages:['Équilibre','Pluie de Justice','Duel des Quais','Le Jugement du Cercle'],
  },
  {
    id:'algeria',order:1,name:'Algérie',code:'DZ',guardian:'Yliane',value:'Loyauté',accent:'#d9b15a',
    unlock:{fragments:1,requires:['france']},weather:['sec','vent','pluie'],
    identity:'Port, ville côtière, reliefs, tunnels et grandes routes vers le désert.',
    routes:routes('dz',['Port des Alliés','Corniche Loyale','Tunnel Atlas','Hauteurs d’Alger','Axe des Frères','Porte du Désert','Route des Crêtes','Serment Final']),
    bossRule:'Coopération : ton coéquipier doit franchir la ligne dans la fenêtre requise.',
    stages:['Duo','Protection','Convoi de Nuit','Serment du Cercle'],
  },
  {
    id:'spain',order:2,name:'Espagne',code:'ES',guardian:'Diego',value:'Passion',accent:'#e23b36',
    unlock:{fragments:1,requires:['france']},weather:['sec','pluie','chaleur'],
    identity:'Front de mer, avenues rapides, vieux quartiers et zones de drift.',
    routes:routes('es',['Boulevard Passion','Port Rouge','Anneau Catalan','Collines de Feu','Rambla Nocturne','Dock Drift','Avenue du Soleil','Flamme Finale']),
    bossRule:'Construis un combo drift-vitesse sans casser la chaîne.',
    stages:['Élan','Sans Retenue','Duel Rouge','Passion du Cercle'],
  },
  {
    id:'morocco',order:3,name:'Maroc',code:'MA',guardian:'Naël',value:'Noblesse',accent:'#d8a34d',
    unlock:{fragments:3,requires:['france']},weather:['sec','sable','nuit claire'],
    identity:'Architecture luxueuse, autoroutes, montagnes et passages minéraux.',
    routes:routes('ma',['Avenue Royale','Kasbah Rapide','Atlas Noble','Palmier Noir','Route des Remparts','Canyon d’Or','Couronne de Nuit','Noblesse Finale']),
    bossRule:'Gagne proprement : collisions et hors-piste pénalisent fortement.',
    stages:['Tenue','Précision','Duel Royal','Couronne du Cercle'],
  },
  {
    id:'italy',order:4,name:'Italie',code:'IT',guardian:'Alessio',value:'Espoir',accent:'#53a96f',
    unlock:{fragments:3,requires:['france']},weather:['pluie','sec','brume'],
    identity:'Routes sinueuses, tunnels, corniches, centres historiques et montagne.',
    routes:routes('it',['Costa Speranza','Tunnel Futuro','Passo Alto','Lago Notte','Viale Rinascita','Strada Lunga','Curva d’Oro','Espoir Final']),
    bossRule:'Remontée : tu pars derrière et dois reprendre le peloton sans perdre ton rythme.',
    stages:['Retard','Remontée','Duel des Crêtes','Espoir du Cercle'],
  },
  {
    id:'tunisia',order:5,name:'Tunisie',code:'TN',guardian:'Soraya',value:'Courage',accent:'#d63b3b',
    unlock:{fragments:5,requires:['france']},weather:['sec','sable','pluie rare'],
    identity:'Ville côtière, port, longues lignes rapides et portes du désert.',
    routes:routes('tn',['Tunis Minuit','Cap Bon Rush','Port Courage','Dunes Rapides','Route Blanche','Longue Droite','Mirage 3B','Courage Final']),
    bossRule:'Haute vitesse avec aides limitées et zones de freinage tardif.',
    stages:['Impulsion','Sans Aide','Duel du Désert','Courage du Cercle'],
  },
  {
    id:'turkey',order:6,name:'Turquie',code:'TR',guardian:'Émir',value:'Foi',accent:'#cfd6e7',
    unlock:{fragments:5,requires:['france']},weather:['pluie','sec','brume'],
    identity:'Deux rives, grands ponts, tunnels, collines et métropole dense.',
    routes:routes('tr',['Pont de Foi','Bosphore Noir','Tunnel des Deux Rives','Galata Run','Axe des Minarets','Colline Sans Carte','Nexus Istanbul','Foi Finale']),
    bossRule:'Navigation : certaines sections suppriment GPS et ligne idéale.',
    stages:['Repères','Sans Carte','Duel des Deux Rives','Foi du Cercle'],
  },
  {
    id:'estonia',order:7,name:'Estonie',code:'EE',guardian:'Eira',value:'Sagesse',accent:'#58b9d6',
    unlock:{fragments:7,requires:['france']},weather:['neige','glace','sec'],
    identity:'Tallinn futuriste, forêt, neige, glace et routes techniques.',
    routes:routes('ee',['Tallinn Clair','Port du Nord','Forêt Sagesse','Anneau Gelé','Kadriorg Tech','Route Aurora','Glace Noire','Sagesse Finale']),
    bossRule:'Adaptation : adhérence et météo évoluent pendant la même course.',
    stages:['Lecture','Changement','Duel de Glace','Sagesse du Cercle'],
  },
];

export const COUNTRY_BY_ID=Object.fromEntries(COUNTRIES.map(c=>[c.id,c]));

const archetypes=[
  {id:'calculator',name:'Calculateur',pace:.92,aggression:.25,error:.025,grip:.96},
  {id:'aggressive',name:'Agressif',pace:.93,aggression:.9,error:.075,grip:.9},
  {id:'drifter',name:'Drifter',pace:.91,aggression:.55,error:.055,grip:.86},
  {id:'sprinter',name:'Sprinteur',pace:.94,aggression:.5,error:.06,grip:.88},
  {id:'defender',name:'Défensif',pace:.925,aggression:.72,error:.04,grip:.94},
  {id:'opportunist',name:'Opportuniste',pace:.935,aggression:.62,error:.05,grip:.92},
  {id:'endurance',name:'Endurant',pace:.918,aggression:.36,error:.018,grip:.95},
];

export const AI_ARCHETYPES=Object.fromEntries(archetypes.map(a=>[a.id,a]));

export function opponentsFor(countryId){
  const country=COUNTRY_BY_ID[countryId];
  if(!country) return [];
  const base=['calculator','aggressive','drifter','sprinter','defender','opportunist'];
  const locals=base.map((type,index)=>({
    id:`${countryId}-rival-${index+1}`,
    name:`${country.code} Rival ${String(index+1).padStart(2,'0')}`,
    role:'rival',type,
    skill:.82+index*.022+country.order*.006,
  }));
  return [
    ...locals,
    {id:`${countryId}-lieutenant`,name:`Lieutenant ${country.code}`,role:'lieutenant',type:'endurance',skill:.965},
    {id:`${countryId}-guardian`,name:country.guardian,role:'guardian',type:country.id==='spain'?'drifter':country.id==='tunisia'?'sprinter':country.id==='algeria'?'defender':'calculator',skill:.985},
  ];
}

const eventTemplates=[
  ['rush',1],['chrono',1],['circuit',1],['duel',1],
  ['flow',2],['rush',2],['redline',2],['circuit',2],
  ['circuit',3],['chrono',3],['duel',3],['convoy',3],
  ['flow',4],['endurance',4],['rush',4],['nexus',4],
  ['endurance',5],['circuit',5],['chrono',5],['duel',5],
  ['convoy',6],['nexus',6],['flow',6],['rush',6],
];

export function eventsFor(countryId){
  const country=COUNTRY_BY_ID[countryId];
  if(!country) return [];
  return eventTemplates.map(([discipline,tier],index)=>{
    const route=country.routes[index%country.routes.length];
    const d=DISCIPLINES[discipline];
    const elite=tier>=6;
    const classMin=Math.min(5,Math.floor((country.order+tier-1)/2));
    const classMax=Math.min(5,classMin+(elite?0:1));
    return {
      id:`${countryId}-e${String(index+1).padStart(2,'0')}`,
      countryId,index:index+1,tier,discipline,routeId:route.id,
      name:`${d.name} · ${route.name}`,
      description:d.description,
      distanceKm:Number((route.distanceKm*(discipline==='endurance'?1.7:discipline==='redline'?.38:1)).toFixed(1)),
      weather:country.weather[index%country.weather.length],
      traffic:discipline==='chrono'||discipline==='redline'?'low':route.traffic>.58?'high':'medium',
      classMin:VEHICLE_CLASSES[classMin].id,
      classMax:VEHICLE_CLASSES[classMax].id,
      elite,
      major:index%4===3,
      reward:{influence:260+tier*100+(elite?80:0),xp:110+tier*40+(elite?75:0),coins:760+tier*280+(elite?500:0)},
      mastery:{clean:discipline!=='flow',targetFactor:1-(tier*.012),special:discipline},
    };
  });
}

export const ALL_EVENTS=COUNTRIES.flatMap(c=>eventsFor(c.id));
export const EVENT_BY_ID=Object.fromEntries(ALL_EVENTS.map(e=>[e.id,e]));

export const FINAL_NEXUS={
  id:'nexus-final',name:'Le Cercle Restauré',requiredFragments:8,
  sectors:COUNTRIES.map(c=>({countryId:c.id,value:c.value,guardian:c.guardian,rule:c.bossRule})),
};

export function countryTier(influence=0){
  let tier=1;
  for(let i=0;i<TIER_THRESHOLDS.length;i++) if(influence>=TIER_THRESHOLDS[i]) tier=i+1;
  return Math.min(7,tier);
}

export function isCountryUnlocked(countryId,state){
  const country=COUNTRY_BY_ID[countryId];
  if(!country) return false;
  const fragments=state?.fragments?.length||0;
  if(fragments<country.unlock.fragments) return false;
  return country.unlock.requires.every(id=>state?.territories?.[id]?.guardianDefeated);
}
