import {COUNTRIES,isCountry} from './countries.js';
// One unit = one metre. Canon comes from the owner's 3B ORIGINS brief.
export const SCALE=Object.freeze({human:1.8,door:2.65,doorWidth:1.8,storey:3.1,step:.16,radius:.32});
export const WORLDS=[
 {id:'france',name:'France',city:'Paris',value:'Justice',canon:true,available:true},
 {id:'algerie',name:'Algérie',city:'Alger',value:'Courage'},
 {id:'maroc',name:'Maroc',city:'Rabat',value:'Sagesse'},
 {id:'tunisie',name:'Tunisie',city:'Tunis',value:'Patience'},
 {id:'espagne',name:'Espagne',city:'Madrid',value:'Unité'},
 {id:'italie',name:'Italie',city:'Rome',value:'Loyauté'},
 {id:'turquie',name:'Turquie',city:'Istanbul / Ankara',value:'Vérité'},
 {id:'estonie',name:'Estonie',city:'Tallinn',value:'Mémoire'},
].map((w,i)=>({...w,available:true,associationStatus:w.canon?'validated':'proposal',x:Math.sin(i*Math.PI/4)*29,z:-Math.cos(i*Math.PI/4)*29,angle:-i*Math.PI/4}));
export const GUARDIAN={id:'justice-guardian',name:'Gardien de Justice',identityStatus:'pending-owner-reference',appearanceStatus:'provisional',note:'Céliane : aucun rôle attribué sans référence validée.'};
export const SPAWNS={sanctuary:{x:0,z:20},france:{x:0,z:25},...Object.fromEntries(Object.keys(COUNTRIES).map(id=>[id,{x:0,z:25}]))};
export const BUILDINGS=[
 ['maison-sud','Maison',-21,16,.2],['cafe-ouest','Cafe',-39,16,0],['residence-sud','Residence',19,15,-.1],['angle-est','Maison',39,17,-.15],
 ['galerie-ouest','Galerie',-24,-4,0],['maison-ouest','Maison',-44,-4,.1],['cafe-est','Cafe',23,-7,Math.PI],['residence-est','Residence',43,-8,0],
 ['terrasses','Maison',-42,-26,.15],['galerie-est','Galerie',46,-29,Math.PI],['residence-nord','Residence',-26,-29,0],['maison-nord','Maison',28,-31,0],
 ['angle-nord-ouest','Maison',-42,-48,.05],['angle-nord-est','Residence',43,-48,-.12],['quai','Cafe',-58,26,0],['horizon','Maison',59,12,0],
].map(([id,model,x,z,angle])=>({id,model,x,z,angle,scale:.55,width:(model==='Galerie'?23:model==='Cafe'?20:18)*.55,depth:(model==='Galerie'?13:14)*.55}));
export const ROOMS=[{id:'atelier',name:'Atelier des Liens',x:-17,z:33,w:12,d:9},{id:'refuge',name:'Maison des souvenirs',x:18,z:33,w:12,d:9},{id:'archives',name:'Archives effacées',x:0,z:-66,w:26,d:23}];
// Rendered furniture and navigation use exactly the same metre-scale footprints.
export const ROOM_SHELVES=ROOMS.flatMap(room=>[-1,1].map(side=>({id:room.id+'-shelf-'+side,room:room.id,x:room.x+side*(room.w/2-1.2),z:room.z,w:1.4,d:room.id==='archives'?13:4,h:1.8})));
export const EIFFEL_SITE={x:-75,z:-118,height:60};
export const ROADS=[[[0,30],[0,15],[2,2],[0,-14],[-2,-28],[0,-42],[0,-54]],
 [[-56,30],[-35,29],[-17,25],[0,25],[18,25],[39,28],[56,24]],
 [[-53,5],[-38,5],[-20,5],[2,2],[23,3],[42,3],[56,0]],
 [[-55,-17],[-37,-17],[-16,-15],[0,-14],[20,-19],[39,-20],[56,-18]],
 [[-53,-39],[-35,-39],[-15,-43],[0,-42],[19,-43],[39,-39],[55,-40]],
 [[-54,25],[-53,5],[-55,-17],[-53,-39],[-55,-65]],
 [[56,24],[56,0],[56,-18],[55,-40],[55,-64]], [[-55,-65],[-60,-78],[-69,-91],[-75,-101],[-75,-118]]];
export const POINTS={
 eiffel:{zone:'france',x:-75,z:-105,name:'Parvis de la tour Eiffel'},
 circle:{zone:'sanctuary',x:0,z:9,name:'Cercle Brisé'},
 arrival:{zone:'france',x:0,z:25,name:'Porte du Sanctuaire'},
 resident:{zone:'france',x:3,z:15,name:'Une habitante du quartier'},
 atelier:{zone:'france',x:-17,z:33,name:'Artisan des Liens'},
 refuge:{zone:'france',x:18,z:33,name:'Maison des souvenirs'},
 trace:{zone:'france',x:-8,z:-11,name:'Une trace oubliée'},
 secret:{zone:'france',x:12,z:-4,name:'Souvenir sous le tilleul'},
 guardian:{zone:'france',x:0,z:-43,name:'Gardien de Justice'},
 seal:{zone:'france',x:-5,z:-44,name:'Sceau de la confiance'},
 trial:{zone:'france',x:5,z:-44,name:'Balance de Justice'},
 archive:{zone:'france',x:0,z:-53,name:'Porte des Archives'},
 echo:{zone:'france',x:-6,z:-61,name:'Premier témoignage'},
 echo2:{zone:'france',x:6,z:-68,name:'Second témoignage'},
 fragment:{zone:'france',x:0,z:-72,name:'Fragment de Justice'},
 flower:{zone:'france',x:-35,z:-15,name:'Graines de lumière'},
 memory:{zone:'france',x:0,z:-34,name:'Souvenir du passage haut',y:2.4},
};
export const QUESTS=[
 {id:'justice-01',kind:'main',title:'Les voix effacées',reward:40,steps:['Traverser la porte France et parler à une habitante.','Demander au loup de chercher près de la fontaine.','Révéler la trace avec la Vision de Mémoire, puis la lire.']},
 {id:'justice-02',kind:'main',title:'Les deux plateaux',reward:60,steps:['Rencontrer le gardien devant les Archives.','Confier le sceau gauche au loup, puis activer le plateau droit.']},
 {id:'justice-03',kind:'main',title:'Ce qui nous relie',reward:120,steps:['Retrouver les deux témoignages dans les Archives.','Dissiper la manifestation de l’Oubli.','Recueillir le fragment de Justice et le replacer au Sanctuaire.']},
 {id:'garden',kind:'side',title:'Un jardin pour demain',reward:30,steps:['Parler à l’artisan dans l’atelier.','Récupérer les graines du jardin ouest et les rapporter.']},
 {id:'remembrance',kind:'side',title:'La mémoire des hauteurs',reward:35,steps:['Parler à l’habitante de la Maison des souvenirs.','Révéler le souvenir sur le passage haut et le rapporter.']},
];
export function objective(s){
 if(isCountry(s.zone)){const r=s.regions?.[s.zone]||{};if(!r.gathered)return {text:'Récolte au jardin pour restaurer le quartier et améliorer ta tenue.',target:'country-garden'};if(r.supplies>=3&&r.restored<3)return {text:'Rapporte tes matériaux au jardin : une partie du quartier peut reprendre vie.',target:'country-garden'};if(r.supplies>=2&&!r.upgrade)return {text:'L’artisan peut renforcer ta tenue avec tes matériaux.',target:'atelier'};return {text:'Repousse l’Oubli dans la clairière pour sécuriser une nouvelle récolte, ou explore librement.',target:'country-encounter'};}
 if(!s.flags.awakened)return {text:'Approche-toi du Cercle Brisé.',target:'circle'};
 if(s.zone==='sanctuary'){
  if(s.flags.justice&&!s.flags.returned)return {text:'Rapporte la Justice au Cercle Brisé.',target:'circle'};
  return {text:s.flags.returned?'Explore les huit pays et retrouve leurs habitants.':'Explore les huit portes ; la France porte la première quête de Justice.',target:'france'};
 }
 if(!s.flags.met)return {text:'Une voix attend dans le quartier France.',target:s.zone==='sanctuary'?'france':'resident'};
 if(!s.flags.trace)return {text:s.flags.scent?'Révèle et lis la trace près de la fontaine.':'Le loup peut retrouver une trace près de la fontaine.',target:'trace'};
 if(!s.flags.trial)return {text:s.flags.guardian?'Confie le sceau gauche au loup, puis rejoins le plateau droit.':'Rencontre le gardien aux Archives.',target:s.flags.guardian?'seal':'guardian'};
 if(!s.flags.echo||!s.flags.echo2)return {text:'La Vision de Mémoire révèle deux témoignages dans les Archives.',target:!s.flags.echo?'echo':'echo2'};
 if(!s.flags.defeated)return {text:'Dissipe l’Oubli. Évite les attaques annoncées au sol.',target:'fragment'};
 if(!s.flags.justice)return {text:'Recueille le fragment de Justice.',target:'fragment'};
 if(!s.flags.returned)return {text:'Rapporte la Justice au Cercle Brisé.',target:s.zone==='france'?'arrival':'circle'};
 return {text:'Le quartier se souvient. Explore les passages et aide ses habitants.',target:'resident'};
}
