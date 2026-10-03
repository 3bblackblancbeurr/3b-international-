import {cityMapBlueprint,cityMapCustomRoads} from './city3b-map.js';
export const LANDSCAPE_TOOLS=[['lake','Lac'],['river','Rivière'],['tree','Arbre Matrix'],['garden','Jardin'],['bench','Banc'],['light','Éclairage'],['hill','Montagne'],['basin','Creux']];
export const LANDSCAPE_WIDTHS={lake:[12,24,40],river:[4,8,12],tree:[2,4,6],garden:[4,8,12],bench:[2],light:[2],hill:[40,80,120],basin:[24,40,80]};
export const isWater=f=>f.kind==='lake'||f.kind==='river';
export function segmentDistance(p,r){const dx=r.x2-r.x1,dz=r.z2-r.z1,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p.x-r.x1)*dx+(p.z-r.z1)*dz)/l)):0;return Math.hypot(p.x-r.x1-t*dx,p.z-r.z1-t*dz);}
export function cityLandscape(data={}){return (Array.isArray(data.city?.city?.terrain)?data.city.city.terrain:[]).filter(f=>LANDSCAPE_WIDTHS[f.kind]&&[f.x1,f.z1,f.x2,f.z2,f.width].every(Number.isFinite)).slice(0,128);}
export function snapRoadPoint(point,roads){let best={x:Math.round(point.x/2)*2,z:Math.round(point.z/2)*2},distance=6;for(const r of roads){const dx=r.x2-r.x1,dz=r.z2-r.z1,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((point.x-r.x1)*dx+(point.z-r.z1)*dz)/l)):0,p={x:Math.round(r.x1+t*dx),z:Math.round(r.z1+t*dz)},d=Math.hypot(point.x-p.x,point.z-p.z);if(d<distance){best=p;distance=d;}}return best;}
export function roadDraft(start,end,roads=[],width=4,mode='straight'){
 const a=snapRoadPoint(start,roads),b=snapRoadPoint(end,roads),corner=Math.abs(b.x-a.x)>=Math.abs(b.z-a.z)?{x:b.x,z:a.z}:{x:a.x,z:b.z};
 const points=mode==='corner'?[a,corner,b]:[a,b];
 if(mode==='corner'&&points.slice(1).some((p,i)=>{const l=Math.hypot(p.x-points[i].x,p.z-points[i].z);return l>0&&l<6;}))return [];
 return points.slice(1).map((p,i)=>({x1:points[i].x,z1:points[i].z,x2:p.x,z2:p.z,width})).filter(r=>Math.hypot(r.x2-r.x1,r.z2-r.z1)>=6);
}
export function landscapeDraft(kind,start,end,width){const a={x:Math.round(start.x),z:Math.round(start.z)},b=kind==='river'?{x:Math.round(end.x),z:Math.round(end.z)}:a;return {kind,x1:a.x,z1:a.z,x2:b.x,z2:b.z,width};}
export function footprintRadius(b){return Math.max(1.2,Math.min(8,Math.hypot(Number(b.footprint_w)||1,Number(b.footprint_h)||1)*.26));}
export function landscapeCheck(data,features,{road=false}={}){
 const half=cityMapBlueprint(data).half,placed=(data.placements||[]).filter(b=>b.placement_state!=='stored');
 for(const f of features){
  if(![f.x1,f.z1,f.x2,f.z2,f.width].every(Number.isFinite)||f.width<2||f.width>(isRelief(f)?120:40))return {valid:false,reason:'Dimensions invalides'};
  const radius=f.width/2;
  if(Math.min(f.x1,f.x2)-radius< -half||Math.max(f.x1,f.x2)+radius>half||Math.min(f.z1,f.z2)-radius< -half||Math.max(f.z1,f.z2)+radius>half)return {valid:false,reason:'Hors du terrain'};
  if((road||f.kind==='river')&&Math.hypot(f.x2-f.x1,f.z2-f.z1)<6)return {valid:false,reason:'Allonge le tracé à au moins 6 mètres'};
  if(placed.some(b=>segmentDistance({x:Number(b.x)+Number(b.footprint_w)/2,z:Number(b.z)+Number(b.footprint_h)/2},f)<radius+footprintRadius(b)))return {valid:false,reason:'Ce tracé traverse un bâtiment'};
  if(!road&&cityLandscape(data).some(r=>(isRelief(f)||isRelief(r))&&segmentsDistance(f,r)<radius+r.width/2))return {valid:false,reason:'Un relief occupe cette zone'};
  const others=road?cityLandscape(data).filter(f=>isWater(f)||isRelief(f)):cityMapCustomRoads(data);
  if((road||isWater(f)||isRelief(f))&&others.some(r=>segmentsDistance(f,r)<radius+r.width/2))return {valid:false,reason:road?'Une étendue d’eau bloque ce tracé':'Une route passe ici'};
 }
 return {valid:features.length>0,reason:features.length?'Aperçu prêt · valide pour enregistrer':'Choisis un tracé plus long'};
}
export function segmentsDistance(a,b){
 const cross=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x),p={x:a.x1,z:a.z1},q={x:a.x2,z:a.z2},r={x:b.x1,z:b.z1},s={x:b.x2,z:b.z2};
 if(cross(p,q,r)*cross(p,q,s)<0&&cross(r,s,p)*cross(r,s,q)<0)return 0;
 return Math.min(segmentDistance(p,b),segmentDistance(q,b),segmentDistance(r,a),segmentDistance(s,a));
}

export const isRelief=f=>f.kind==='hill'||f.kind==='basin';
export function terrainHeight(features,x,z){let height=0;for(const f of features){if(!isRelief(f))continue;const t=Math.max(0,1-Math.hypot(x-f.x1,z-f.z1)/(f.width/2));height+=(f.kind==='hill'?f.width*.22:-f.width*.08)*t*t*(3-2*t);}return height;}

// JSONB returns object keys in its own order. Compare values, not serialization order.
export function sameCityPlan(a,b){
 const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
 return JSON.stringify(stable(a))===JSON.stringify(stable(b));
}
