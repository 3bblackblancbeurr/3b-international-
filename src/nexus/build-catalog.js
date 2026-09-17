export const BUILD_CATEGORIES=['routes','residential','commerce','workshop','culture','sport','transport','energy','water','nature','event','monument'];
const countries=['3b','france','italie','estonie','turquie','algerie','tunisie','maroc','espagne'];
const templates=[
 ['road-straight','routes','Route 3B',1,4,12],['road-curve','routes','Virage 3B',1,8,8],['home-small','residential','Maison du Cercle',2,8,8],['tower-home','residential','Tour Héritage',5,14,14],
 ['market','commerce','Marché des Liens',3,14,12],['atelier','workshop','Atelier 3B',3,12,10],['museum','culture','Maison des Héritages',5,18,16],['arena','sport','Terrain 3B',4,24,16],
 ['station','transport','Station Matrix',5,22,12],['solar','energy','Tour solaire',4,10,10],['water','water','Jardin d’eau',3,14,14],['park','nature','Parc du Cercle',2,18,18],
 ['stage','event','Scène communautaire',4,16,14],['monument','monument','Monument de l’Union',8,20,20],
];
export const BUILDINGS=countries.flatMap((country,ci)=>templates.map(([base,category,name,level,w,d],i)=>({id:`${country}-${base}`,country,category,name:country==='3b'?name:`${name} · ${country[0].toUpperCase()+country.slice(1)}`,level,cost:Math.round((level*40+i*7)*(country==='3b'?1:1.15)),size:{w,d},rotationStep:15,rarity:level>=8?'legendary':level>=5?'epic':level>=3?'rare':'common',style:ci})));
export const buildingById=Object.fromEntries(BUILDINGS.map(b=>[b.id,b]));
export function canPlace(city,building,x,z,rotation=0){
 if(!building)return false;const halfW=building.size.w/2,halfD=building.size.d/2;
 if(Math.abs(x)>480-halfW||Math.abs(z)>480-halfD)return false;
 return !(city?.placements||[]).some(p=>{const other=buildingById[p.building];if(!other)return false;return Math.abs(p.x-x)<(other.size.w+building.size.w)/2+1&&Math.abs(p.z-z)<(other.size.d+building.size.d)/2+1;});
}
export function cityCost(city){return (city?.placements||[]).reduce((sum,p)=>sum+(buildingById[p.building]?.cost||0),0);}
