export const CITY_DISTRICTS={
 France:{angle:0,value:'Justice'},
 Italie:{angle:45,value:'Espoir'},
 Estonie:{angle:90,value:'Sagesse'},
 Turquie:{angle:135,value:'Foi'},
 Algérie:{angle:180,value:'Loyauté'},
 Tunisie:{angle:225,value:'Courage'},
 Maroc:{angle:270,value:'Noblesse'},
 Espagne:{angle:315,value:'Passion'},
};

export const MAX_BUILDING_FOOTPRINT=64;
export function landHalfSize(tier=1){return 50+Math.max(1,Math.min(10,Number(tier)||1))*45}
export function districtPosition(country,radius=150){const entry=CITY_DISTRICTS[country]||CITY_DISTRICTS.France;const a=entry.angle*Math.PI/180;return{x:Math.sin(a)*radius,z:-Math.cos(a)*radius}}
export function rotatedFootprint(building,rotation=0){const fp=building?.footprint||{};let w=Math.max(1,Math.min(MAX_BUILDING_FOOTPRINT,Number(fp.w)||1)),h=Math.max(1,Math.min(MAX_BUILDING_FOOTPRINT,Number(fp.h)||1));if(Number(rotation)%180!==0)[w,h]=[h,w];return{w,h}}
export function placementBox(x,z,w,h){return{minX:Number(x),maxX:Number(x)+w-1,minZ:Number(z),maxZ:Number(z)+h-1}}
export function boxesOverlap(a,b){return !(a.maxX<b.minX||a.minX>b.maxX||a.maxZ<b.minZ||a.minZ>b.maxZ)}
export function isPlacementValid({city,building,x,z,rotation=0,placements=[],excludeId=null}){if(!city||!building)return{valid:false,reason:'Sélectionne un bâtiment'};const {w,h}=rotatedFootprint(building,rotation),half=landHalfSize(city.land_tier),box=placementBox(x,z,w,h);if(box.minX< -half||box.minZ< -half||box.maxX>half||box.maxZ>half)return{valid:false,reason:'Hors du terrain',w,h};const collision=placements.some(p=>p.id!==excludeId&&(p.placement_state||'placed')==='placed'&&boxesOverlap(box,placementBox(p.x,p.z,p.footprint_w||1,p.footprint_h||1)));if(collision)return{valid:false,reason:'Parcelle occupée',w,h};return{valid:true,reason:'Emplacement valide',w,h}}
