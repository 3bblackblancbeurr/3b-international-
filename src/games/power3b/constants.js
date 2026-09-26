export const POWER3B_VERSION=1;
export const MAX_ORDERS=5;
export const NATIONS=[
 {id:0,code:'FR',name:'France',value:'Justice',primary:'#2f6dff'},
 {id:1,code:'DZ',name:'Algérie',value:'Loyauté',primary:'#1c9b61'},
 {id:2,code:'ES',name:'Espagne',value:'Passion',primary:'#b53a2f'},
 {id:3,code:'MA',name:'Maroc',value:'Noblesse',primary:'#9a2538'},
 {id:4,code:'IT',name:'Italie',value:'Espoir',primary:'#2f8b68'},
 {id:5,code:'TN',name:'Tunisie',value:'Courage',primary:'#d14343'},
 {id:6,code:'TR',name:'Turquie',value:'Foi',primary:'#c42f37'},
 {id:7,code:'EE',name:'Estonie',value:'Sagesse',primary:'#2b6d91'}
];
export const UNIT_TYPES={infantry:{name:'Infanterie',domain:'land',strength:1,move:1,cost:8,icon:'◆'},regiment:{name:'Régiment',domain:'land',strength:3,move:1,cost:18,icon:'⬢'},tank:{name:'Char',domain:'land',strength:5,move:2,cost:28,icon:'▰'},fighter:{name:'Chasseur',domain:'air',strength:4,move:3,cost:24,icon:'✦'},bomber:{name:'Bombardier',domain:'air',strength:7,move:2,cost:38,icon:'✶'},destroyer:{name:'Destroyer',domain:'sea',strength:5,move:2,cost:30,icon:'▲'},cruiser:{name:'Croiseur',domain:'sea',strength:8,move:1,cost:46,icon:'⬟'},flag:{name:'Drapeau',domain:'fixed',strength:0,move:0,cost:0,icon:'⚑'}};
export const EXCHANGES=[{from:'infantry',count:3,to:'regiment'},{from:'regiment',count:2,to:'tank'},{from:'fighter',count:2,to:'bomber'},{from:'destroyer',count:2,to:'cruiser'}];
