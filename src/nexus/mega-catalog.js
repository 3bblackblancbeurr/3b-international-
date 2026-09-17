import {COUNTRY_ASSET_KITS} from '../world/country-assets.js';
const STANDARD_TARGET=100,INTERNATIONAL_TARGET=160;
const TYPES=[
 ['home','Maison'],['villa','Villa'],['residence','Résidence'],['apartment','Immeuble'],['tower','Tour'],['skyscraper','Gratte-ciel'],['shop','Commerce'],['hotel','Hôtel'],['restaurant','Restaurant'],['workshop','Atelier'],['factory','Manufacture'],['school','École'],['culture','Centre culturel'],['hospital','Centre de soins'],['stadium','Stade'],['arena','Arène'],['station','Gare'],['transit','Station'],['port','Port'],['energy','Énergie'],['monument','Monument'],['park','Parc'],['square','Place'],['bridge','Pont'],['tunnel','Tunnel'],['road','Route'],['street','Rue'],['furniture','Mobilier'],['garden','Jardin'],['market','Marché'],['library','Bibliothèque'],['museum','Musée'],['lab','Centre technologique'],['community','Maison communautaire'],['garage','Garage'],['farm','Ferme urbaine'],['water','Infrastructure eau'],['sport','Complexe sportif'],['event','Scène'],['lookout','Belvédère']
];
const FORMS={
 france:['verrière verticale','pierre et rubans Matrix','toit mansardé futuriste','arc ferroviaire','façade atelier'],
 algerie:['terrasses blanches','casbah verticale','arc de source','patio oasis','volumes sahariens'],
 maroc:['zellige paramétrique','riad vertical','arc Atlas','cour jardin','volumes ocre'],
 tunisie:['blanc méditerranéen','arc bleu futuriste','terrasse Carthage','patio marin','mosaïque cinétique'],
 turquie:['dôme suspendu','croissant structurel','terrasse Bosphore','volume Cappadoce','arc astrolabe'],
 espagne:['patio solaire','arc cinétique','façade azulejo','terrasse andalouse','tour du vent'],
 italie:['loggia verticale','marbre cinétique','arc Renaissance','terrasse toscane','dôme contemporain'],
 estonie:['cristal boréal','forteresse nordique','bois-verre sombre','tour d’aurore','volume baltique'],
 international:['cercle brisé structurel','rubans des huit valeurs','mégatour Matrix','agora orbitale','verre noir et or']
};
const DISTRICTS=['centre','résidentiel','créateurs','héritage','sport','transport','nature','industrie légère','culture','rives'];
function make(country,index){const kit=COUNTRY_ASSET_KITS[country],type=TYPES[index%TYPES.length],form=FORMS[country][Math.floor(index/TYPES.length)%FORMS[country].length],variant=Math.floor(index/(TYPES.length*FORMS[country].length))+1,hero=index<kit.architecture.length;return{id:`mega-${country}-${String(index+1).padStart(3,'0')}`,country,type:type[0],category:type[0],name:hero?kit.architecture[index]:`${type[1]} · ${form} ${variant}`,form,district:DISTRICTS[index%DISTRICTS.length],materials:kit.materials,vegetation:kit.vegetation,size:{w:8+(index*7)%30,d:8+(index*11)%26,h:4+(index*13)%80},level:1+(index%50),cost:60+(index%25)*45,rarity:index%97===0?'legendary':index%23===0?'epic':index%7===0?'rare':'common',rotationStep:15,upgradeLevels:5,hero};}
export const MEGA_CATALOG=Object.keys(COUNTRY_ASSET_KITS).flatMap(country=>Array.from({length:country==='international'?INTERNATIONAL_TARGET:STANDARD_TARGET},(_,i)=>make(country,i)));
export const MEGA_BY_ID=Object.fromEntries(MEGA_CATALOG.map(x=>[x.id,x]));
export function megaForCountry(country){return MEGA_CATALOG.filter(x=>x.country===country);}
export function megaByCategory(country,category){return MEGA_CATALOG.filter(x=>x.country===country&&x.category===category);}
export const MEGA_COUNTS=Object.fromEntries(Object.keys(COUNTRY_ASSET_KITS).map(country=>[country,megaForCountry(country).length]));
