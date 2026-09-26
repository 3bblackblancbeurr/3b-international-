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
// Valeurs et déplacements de la table de référence du POWER original.
export const UNIT_TYPES={
 infantry:{name:'Infanterie',domain:'land',strength:2,move:2,cost:2,icon:'◆',tier:'small'},
 tank:{name:'Tank',domain:'land',strength:3,move:3,cost:3,icon:'▰',tier:'small'},
 fighter:{name:'Chasseur',domain:'air',strength:5,move:5,cost:5,icon:'✦',tier:'small'},
 destroyer:{name:'Destroyer',domain:'sea',strength:10,move:1,cost:10,icon:'▲',tier:'small'},
 regiment:{name:'Régiment',domain:'land',strength:20,move:2,cost:20,icon:'⬢',tier:'large'},
 heavyTank:{name:'Char lourd',domain:'land',strength:30,move:3,cost:30,icon:'▣',tier:'large'},
 bomber:{name:'Bombardier',domain:'air',strength:25,move:5,cost:25,icon:'✶',tier:'large'},
 cruiser:{name:'Croiseur',domain:'sea',strength:50,move:1,cost:50,icon:'⬟',tier:'large'},
 flag:{name:'Drapeau',domain:'fixed',strength:0,move:0,cost:0,icon:'⚑',tier:'fixed'}
};
export const EXCHANGES=[
 {from:'infantry',count:3,to:'regiment'},
 {from:'tank',count:3,to:'heavyTank'},
 {from:'fighter',count:3,to:'bomber'},
 {from:'destroyer',count:3,to:'cruiser'}
];
