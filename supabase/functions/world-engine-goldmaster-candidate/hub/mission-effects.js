import missions from './data/missions-v1.json' with {type:'json'};

// Consequences are derived from authoritative mission rows. No client flag,
// extra reward or second copy of progress is needed to keep the Cité restored.
export const HUB_MISSION_EFFECTS=Object.freeze({
 first_steps:{district:'heritage_square',kind:'archive',label:'Repères des voyageurs',detail:'Le pupitre d’accueil rassemble les premiers repères de la Cité.'},
 first_echo:{district:'archives',kind:'archive',label:'Mémoire retrouvée',detail:'Un pupitre éclairé conserve le souvenir et sa balise aux Archives.'},
 eight_signals:{district:'broken_circle_tower',kind:'signal',label:'Huit signaux accordés',detail:'Huit bornes stables entourent le relais du Cercle Brisé.'},
 rooftops_circle:{district:'arena',kind:'route',label:'Parcours balisé',detail:'Les balises du parcours indiquent désormais le départ et la réception.'},
 boat_without_flag:{district:'docks',kind:'archive',label:'Carnet du quai',detail:'Le relevé du quai est conservé sur un pupitre des Docks.'},
 storm_rescue:{district:'docks',kind:'refuge',label:'Point de secours',detail:'Un abri et son point d’eau rappellent le retour de l’équipage.'},
 memory_under_water:{district:'docks',kind:'archive',label:'Archives du rivage',detail:'Trois fragments retrouvés sont réunis sur le pupitre du rivage.'},
 wagon_eight:{district:'docks',kind:'signal',label:'Repère du Wagon 8',detail:'Le réseau conserve huit signaux de mémoire au départ du train.'},
 blue_blackout:{district:'innovation',kind:'relay',label:'Relais remis en service',detail:'Trois relais affichent une lumière stable après le redémarrage.'},
 garden_listens:{district:'gardens',kind:'garden',label:'Jardin des échos',detail:'Un îlot planté accueille les traces du jardin qui écoute.'},
 first_foundation:{district:'city3b_portal',kind:'route',label:'Fondation du quartier',detail:'Une première place et ses repères matérialisent le plan du quartier.'},
 voices_square:{district:'community',kind:'meeting',label:'Place des échanges',detail:'Des sièges disposés autour d’une table accueillent les habitants.'},
 passion_trial:{district:'arena',kind:'route',label:'Espace de maîtrise',detail:'Le parcours d’entraînement porte les repères de l’épreuve accomplie.'},
 silent_cable:{district:'innovation',kind:'relay',label:'Liaison stabilisée',detail:'Le poste de contrôle conserve le signal de la cabine accompagnée.'},
 three_reflections:{district:'commerce',kind:'archive',label:'Motif des reflets',detail:'Trois plaques de verre réunissent les reflets relevés sous la pluie.'},
 eight_seeds:{district:'gardens',kind:'garden',label:'Conservatoire planté',detail:'Huit plantations prennent place dans le conservatoire.'},
 golden_pattern:{district:'commerce',kind:'workshop',label:'Atelier du Motif d’Or',detail:'L’établi conserve un ouvrage doré et ses matériaux assemblés.'},
 living_fabric:{district:'commerce',kind:'workshop',label:'Fibre stabilisée',detail:'Les échantillons de l’atelier portent désormais une couleur stable.'},
 lost_wolf_signal:{district:'gardens',kind:'refuge',label:'Accueil du loup-signal',detail:'Un abri ouvert et un point d’eau préservent une issue pour l’animal.'},
 broken_record:{district:'archives',kind:'archive',label:'Message restauré',detail:'Un second pupitre relie les fragments du message restauré.'},
});
const counts=Object.fromEntries(missions.map(m=>[m.id,m.objectives.length]));

export function hubMissionEffect(hub,missionId){
 const row=hub?.missions?.[missionId],definition=HUB_MISSION_EFFECTS[missionId];
 if(!definition||row?.status!=='completed'||!Number.isInteger(row.completedObjectives)||row.completedObjectives<counts[missionId])return null;
 return {missionId,...definition};
}
export function hubDistrictEffects(hub,district){
 return Object.keys(HUB_MISSION_EFFECTS).map(id=>hubMissionEffect(hub,id)).filter(effect=>effect&&(!district||effect.district===district));
}
export function hubMissionEffectItems(hub,plan,buildings=[]){
 const districtCount=new Map(),placed=[];
 return hubDistrictEffects(hub).map(effect=>{
  const district=plan.districts.find(d=>d.id===effect.district),index=districtCount.get(effect.district)||0;
  districtCount.set(effect.district,index+1);
  const center={x:(district.center[0]-.5)*1800,z:(district.center[1]-.5)*1400};
  let best=null;
  for(const radius of [18,30,42])for(let turn=0;turn<24;turn++){
   const angle=(turn+index*3)*Math.PI/12,p={x:center.x+Math.cos(angle)*radius,z:center.z+Math.sin(angle)*radius};
   const clearance=Math.min(80,...buildings.map(b=>Math.hypot(p.x-(b.buildingX??b.x),p.z-(b.buildingZ??b.z))-Math.hypot(b.width,b.depth)/2),...placed.map(other=>Math.hypot(p.x-other.x,p.z-other.z)-10));
   const score=clearance-radius*.3-Math.abs(turn-index*7)*.2;
   if(!best||score>best.score)best={...p,score,heading:angle};
  }
  placed.push(best);
  return {id:'hub:restoration:'+effect.missionId,type:'hubRestoration',range:-1,...effect,name:effect.label,x:best.x,z:best.z,heading:best.heading};
 });
}
