export const ORIGIN_WORLD={
 id:'origin',name:'Cité Origine',size:16000,halfSize:8000,chunkSize:256,
 streaming:{mobileRadius:1,desktopRadius:2,lod:[80,220,600],simulationRadius:1},
 zones:[
  {id:'central',name:'Origine Central',x:0,z:0,r:1250,kind:'metropolis'},
  {id:'heritage',name:'Ceinture des Héritages',x:-1350,z:700,r:900,kind:'district'},
  {id:'workers',name:'Plaine des Ouvriers',x:1700,z:1250,r:1250,kind:'pasture'},
  {id:'highlands',name:'Hautes Terres',x:2650,z:-1700,r:1300,kind:'mountain'},
  {id:'matrix-river',name:'Rives Matrix',x:-1850,z:-950,r:1050,kind:'waterfront'},
  {id:'echo-forest',name:'Forêt des Échos',x:850,z:-2300,r:1150,kind:'forest'},
  {id:'broken-circle',name:'Friches du Cercle',x:-2450,z:2100,r:1000,kind:'ruins'},
  {id:'outer-ring',name:'Couronne extérieure',x:0,z:0,r:6000,kind:'travel'},
 ],
};

export const ORIGIN_GATES=[
 {id:'france',name:'Porte de France',x:-2450,z:-1180,value:'Justice'},
 {id:'italie',name:'Porte d’Italie',x:1880,z:-2680,value:'Espoir'},
 {id:'estonie',name:'Porte d’Estonie',x:3260,z:-720,value:'Sagesse'},
 {id:'turquie',name:'Porte de Turquie',x:2750,z:2260,value:'Foi'},
 {id:'algerie',name:'Porte d’Algérie',x:720,z:3380,value:'Loyauté'},
 {id:'tunisie',name:'Porte de Tunisie',x:-980,z:3060,value:'Courage'},
 {id:'maroc',name:'Porte du Maroc',x:-3060,z:1420,value:'Noblesse'},
 {id:'espagne',name:'Porte d’Espagne',x:-3380,z:-1540,value:'Passion'},
];
export const NEXUS_GATE={id:'nexus-builder',name:'Le Nexus',x:0,z:-3420,kind:'builder',requiredRelays:8};

export function chunkKey(x,z){return `${Math.floor((x+ORIGIN_WORLD.halfSize)/ORIGIN_WORLD.chunkSize)}:${Math.floor((z+ORIGIN_WORLD.halfSize)/ORIGIN_WORLD.chunkSize)}`;}
export function chunksAround(x,z,isMobile=false){
 const radius=isMobile?ORIGIN_WORLD.streaming.mobileRadius:ORIGIN_WORLD.streaming.desktopRadius;
 const cx=Math.floor((x+ORIGIN_WORLD.halfSize)/ORIGIN_WORLD.chunkSize),cz=Math.floor((z+ORIGIN_WORLD.halfSize)/ORIGIN_WORLD.chunkSize),out=[];
 for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++)out.push({x:cx+dx,z:cz+dz,key:`${cx+dx}:${cz+dz}`,priority:Math.max(Math.abs(dx),Math.abs(dz))});
 return out.sort((a,b)=>a.priority-b.priority);
}
export function nexusVisible(progress){return new Set(progress?.originRelays||[]).size>=8;}
export function gateById(id){return ORIGIN_GATES.find(g=>g.id===id)||null;}
