// Presentation catalogue. Completion and rewards always come from the SQL campaign.
export const CITY_CAMPAIGN_CHAPTERS = [
  {id:1,title:'Une ville commence',voice:'Lina · première habitante'},
  {id:2,title:'Un quartier où vivre',voice:'Sami · commerçant'},
  {id:3,title:'Relier les habitants',voice:'Nora · mobilité'},
  {id:4,title:'Prendre soin de chacun',voice:'Aïcha · services publics'},
  {id:5,title:'Culture et rencontres',voice:'Élio · atelier des quartiers'},
  {id:6,title:'Grandir sans se perdre',voice:'Inès · urbaniste'},
  {id:7,title:'Les demandes des habitants',voice:'Maël · médiateur'},
  {id:8,title:'Les huit quartiers unis',voice:'Conseil des quartiers'},
];
const goal=(metric,target,label)=>({metric,target,label});
const build=building=>({tab:'build',building});
const road={tab:'build',tool:'road'};
const mission=(code,chapter,title,description,objectives,coins,cityXp,action,optional=false)=>({code,chapter,title,description,objectives,coins,cityXp,action,optional});
export const CITY_CAMPAIGN_MISSIONS = [
  mission('foundation_hall',1,'Notre première adresse','Lina : « Installons un lieu où accueillir les idées du quartier. »',[goal('building:CITY_HALL_3B',1,'Hôtel de Ville placé')],100,200,build('CITY_HALL_3B')),
  mission('foundation_homes',1,'Deux maisons, un début','Lina : « Il nous faut de vrais logements avant les grandes tours. »',[goal('housing',2,'Logements placés')],150,250,build('HOME_ORIGIN')),
  mission('foundation_road',1,'Le premier chemin','Lina : « Trace une route personnelle pour relier notre quartier. »',[goal('roads',1,'Axe routier distinct')],200,300,road),
  mission('foundation_rearrange',1,'Une place mieux choisie','Déplace une construction existante : ton premier plan peut évoluer.',[goal('moves',1,'Déplacement sauvegardé')],80,100,build('HOME_ORIGIN'),true),
  mission('neighbourhood_park',2,'Un jardin pour respirer','Sami : « Gardons une place pour la nature près des maisons. »',[goal('building:PARK_UNITY',1,'Parc de l’Unité placé')],250,400,build('PARK_UNITY')),
  mission('neighbourhood_shop',2,'Le commerce du quartier','Sami : « Ouvrons un premier commerce de proximité. »',[goal('commerce',1,'Commerce placé')],300,450,build('SHOP_3B')),
  mission('neighbourhood_school',2,'Apprendre près de chez soi','Sami : « Les familles ont besoin d’une école et de logements. »',[goal('building:SCHOOL_3B',1,'École placée'),goal('housing',3,'Logements placés')],350,500,build('SCHOOL_3B')),
  mission('neighbourhood_ambience',2,'L’ambiance de notre ville','Change un réglage d’ambiance puis enregistre-le dans les paramètres.',[goal('environment_changes',1,'Ambiance modifiée et sauvegardée')],100,150,{tab:'settings'},true),
  mission('mobility_roads',3,'Trois chemins utiles','Nora : « Développons un réseau, avec trois axes différents. »',[goal('roads',3,'Axes routiers distincts')],350,600,road),
  mission('mobility_bus',3,'Un arrêt pour tous','Nora : « Un transport de proximité accompagne la croissance. »',[goal('building:BUS_STOP_3B',1,'Arrêt de bus placé')],400,650,build('BUS_STOP_3B')),
  mission('mobility_variety',3,'Un quartier aux usages variés','Nora : « Six types de bâtiments donnent plus de choix aux habitants. »',[goal('variety',6,'Types de bâtiments placés')],450,700,build('WORKSHOP_3B')),
  mission('mobility_collection',3,'Un objet qui raconte','Expose un objet permanent déjà présent dans ton inventaire. Aucun achat n’est requis pour la campagne principale.',[goal('displays',1,'Objet exposé')],150,200,{tab:'collection'},true),
  mission('services_water_energy',4,'Eau et lumière','Aïcha : « Installons les services qui soutiennent la vie du quartier. »',[goal('building:WATER_3B',1,'Station d’eau placée'),goal('building:SOLAR_3B',1,'Station solaire placée')],450,850,build('WATER_3B')),
  mission('services_clinic',4,'Un lieu de soin','Aïcha : « Personne ne doit être oublié lorsque la ville grandit. »',[goal('building:CLINIC_3B',1,'Clinique placée')],500,900,build('CLINIC_3B')),
  mission('services_neighbourhood',4,'Un quartier équilibré','Aïcha : « Fais grandir ensemble logements, commerces et espaces verts. »',[goal('housing',5,'Logements placés'),goal('commerce',2,'Commerces placés'),goal('green',2,'Espaces verts placés')],550,1000,build('HOME_ORIGIN')),
  mission('services_guest',4,'Une première rencontre','Ouvre ta ville au public et laisse un autre membre la visiter. Cette demande est facultative.',[goal('visitors',1,'Visiteur distinct')],200,250,{tab:'settings'},true),
  mission('culture_library',5,'La mémoire du quartier','Élio : « Une bibliothèque donne une place à la transmission. »',[goal('building:LIBRARY_3B',1,'Bibliothèque placée')],600,1100,build('LIBRARY_3B')),
  mission('culture_workshop_cafe',5,'Faire et se retrouver','Élio : « Un atelier et un café créent deux lieux complémentaires. »',[goal('building:WORKSHOP_3B',1,'Atelier placé'),goal('building:CAFE_3B',1,'Café placé')],650,1200,build('WORKSHOP_3B')),
  mission('culture_festival',5,'Le rendez-vous du quartier','Élio : « Préparons un lieu sportif et trois espaces verts pour nos rencontres. »',[goal('sport',1,'Lieu sportif placé'),goal('green',3,'Espaces verts placés')],700,1300,build('ARENA_1618')),
  mission('culture_landmark',5,'Un repère dans le paysage','Ajoute un monument pour donner une silhouette reconnaissable à ta ville.',[goal('landmark',1,'Monument placé')],250,300,build('GOLD_GATE_3B'),true),
  mission('growth_districts',6,'Quatre quartiers ouverts','Inès : « Tes constructions et les missions font grandir la Ville, indépendamment du Monde 3B. »',[goal('districts',4,'Quartiers ouverts')],750,1450,{tab:'districts'}),
  mission('growth_links',6,'Des services dans une ville reliée','Inès : « Six axes, six logements et trois services publics forment une nouvelle base. »',[goal('roads',6,'Axes routiers distincts'),goal('housing',6,'Logements placés'),goal('civic',3,'Services publics placés')],800,1550,road),
  mission('growth_identity',6,'Des usages et des mémoires','Inès : « Varions dix types de bâtiments et deux lieux culturels. »',[goal('variety',10,'Types de bâtiments placés'),goal('culture',2,'Lieux culturels placés')],850,1650,build('SHOWCASE_3B')),
  mission('growth_open',6,'Partager notre plan','Rends ta ville publique si tu souhaites accueillir des visiteurs. Tu peux changer ce réglage ensuite.',[goal('public',1,'Ville rendue publique')],300,350,{tab:'settings'},true),
  mission('citizens_daily_life',7,'Les besoins du quotidien','Maël : « Développons huit logements, trois commerces et cinq services publics. »',[goal('housing',8,'Logements placés'),goal('commerce',3,'Commerces placés'),goal('civic',5,'Services publics placés')],900,1800,build('HOME_ORIGIN')),
  mission('citizens_mobility',7,'Se déplacer dans une ville plus grande','Maël : « Huit axes et deux équipements de mobilité accompagnent notre expansion. »',[goal('roads',8,'Axes routiers distincts'),goal('mobility',2,'Équipements de mobilité placés')],950,1950,road),
  mission('citizens_green_identity',7,'Une croissance qui garde sa personnalité','Maël : « Conservons cinq espaces verts et douze types de bâtiments différents. »',[goal('green',5,'Espaces verts placés'),goal('variety',12,'Types de bâtiments placés')],1000,2100,build('TREE_MATRIX')),
  mission('citizens_replan',7,'Un plan qui évolue','Réorganise plusieurs constructions. Les déplacements restent gratuits et ne rendent pas les Coins déjà investis.',[goal('moves',5,'Déplacements sauvegardés')],350,400,build('HOME_ORIGIN'),true),
  mission('unity_districts',8,'Les huit quartiers','Conseil : « La construction a réuni les huit héritages dans ta propre ville. »',[goal('districts',8,'Quartiers ouverts')],1100,2300,{tab:'districts'}),
  mission('unity_city',8,'Une cité composée','Conseil : « Vingt-quatre constructions, dix axes et six espaces verts donnent une ville généreuse. »',[goal('buildings',24,'Constructions placées'),goal('roads',10,'Axes routiers distincts'),goal('green',6,'Espaces verts placés')],1200,2450,road),
  mission('unity_living_city',8,'Notre ville, notre héritage','Conseil : « Achevons les lieux de vie, de service, de culture et de sport autour d’un monument. »',[goal('housing',10,'Logements placés'),goal('civic',6,'Services publics placés'),goal('culture',3,'Lieux culturels placés'),goal('sport',2,'Lieux sportifs placés'),goal('landmark',1,'Monument placé')],1400,2600,build('COMMUNITY_CENTER')),
  mission('unity_exhibition',8,'Une ville à découvrir','Présente trois objets de ton inventaire et accueille trois membres différents. Ce prolongement social reste facultatif.',[goal('displays',3,'Objets exposés'),goal('visitors',3,'Visiteurs distincts')],400,500,{tab:'collection'},true),
];

export function campaignSummary(campaign){
  const missions=Array.isArray(campaign?.missions)?campaign.missions:[];
  const main=missions.filter(row=>!row.optional),optional=missions.filter(row=>row.optional);
  const claimed=rows=>rows.filter(row=>row.status==='claimed').length;
  const active=main.find(row=>row.status==='ready')||main.find(row=>row.status==='available');
  return {available:campaign?.available===true,missions,mainTotal:main.length,mainClaimed:claimed(main),optionalTotal:optional.length,optionalClaimed:claimed(optional),active,complete:main.length>0&&claimed(main)===main.length};
}

export function missionProgress(row){
  const objectives=Array.isArray(row?.objectives)?row.objectives:[];
  if(row?.status==='claimed')return 100;
  if(!objectives.length)return 0;
  return Math.round(objectives.reduce((sum,goal)=>sum+Math.min(1,Math.max(0,Number(goal.current)||0)/Math.max(1,Number(goal.target)||1)),0)/objectives.length*100);
}
