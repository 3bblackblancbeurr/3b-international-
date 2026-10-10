import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldRealmArt} from '../design-system/tokens.js';
import {FLORA_PALETTES} from './flora.js';
import {villageDoorPath,villageCirculation} from './realm-village-layout.js';
import {obstacleDistance} from './collision.js';

/** Low, walkable herb beds anchor the front corners of a house. Never put
 * vegetation across an entrance or a promenade; no new solid wall is added. */
export function createVillageGardenLayout(layout){
 const gardens=[];
 for(const site of layout.sites.filter(s=>s.monument)){
  const homes=layout.buildings.filter(h=>h.site===site.id),paths=homes.map(h=>villageDoorPath(site,h));
  const lanes=villageCirculation(site).lanes;
  for(const home of homes)for(const side of [-1,1]){
   const x=side*home.width*.34,z=home.depth/2+1.15,c=Math.cos(home.rotation),s=Math.sin(home.rotation);
   const bed={home:home.id,site:site.id,x:home.x+x*c+z*s,z:home.z-x*s+z*c,rotation:home.rotation,width:3.2,depth:1.15};
   const clear=(a,b,padding)=>{const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2);for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps);if(obstacleDistance({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},bed)<padding)return false;}return true;};
   if(paths.some(([a,b])=>!clear(a,b,1.05))||lanes.some(l=>l.points.slice(1).some((b,i)=>!clear(l.points[i],b,l.width/2+.5))))continue;
   gardens.push(bed);
  }
 }
 return gardens;
}

export function createVillageGardenGeometry(region){
 const art=worldRealmArt[region]||worldRealmArt.france,palette=FLORA_PALETTES[region]||FLORA_PALETTES.france,parts=[];
 const stone=new THREE.Color(art.stone).lerp(new THREE.Color(art.ground),.35),soil=new THREE.Color(art.ground).multiplyScalar(.48),leaf=new THREE.Color(palette[1]),blossom=new THREE.Color(art.sun).lerp(new THREE.Color(art.stone),.42);
 function add(source,color,x,y,z,sx,sy,sz){const g=source.index?source.toNonIndexed():source.clone();source.dispose();g.scale(sx,sy,sz);g.translate(x,y,z);const values=new Float32Array(g.attributes.position.count*3);for(let i=0;i<values.length;i+=3)values.set([color.r,color.g,color.b],i);g.setAttribute('color',new THREE.BufferAttribute(values,3));g.deleteAttribute('uv');parts.push(g);}
 const box=(color,x,y,z,w,h,d)=>add(new THREE.BoxGeometry(1,1,1),color,x,y,z,w,h,d);
 box(soil,0,.025,0,3.05,.05,1.03);
 for(const side of [-1,1]){box(stone,side*1.56,.055,0,.08,.11,1.15);box(stone,0,.055,side*.54,3.2,.11,.07);}
 for(let i=0;i<6;i++)add(new THREE.IcosahedronGeometry(1,0),leaf.clone().multiplyScalar(.83+(i%3)*.1),(i-2.5)*.47,.36+(i%2)*.1,Math.sin(i*2.4)*.14,.36,.34+(i%2)*.08,.31);
 for(let i=0;i<4;i++)add(new THREE.IcosahedronGeometry(1,0),blossom,(i-1.5)*.64,.68+(i%2)*.14,.12,.09,.11,.09);
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

// One shared opaque mesh per country, instanced as small street ensembles.
// There are no point lights, transparent leaves or extra material groups.
export function createVillageFurnitureGeometry(region,biome){
 const palette=worldRealmArt[region]||worldRealmArt.france,parts=[],matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
 const stone=new THREE.Color(palette.stone),wood=new THREE.Color(palette.cloth).lerp(new THREE.Color(palette.ground),.55),metal=new THREE.Color(palette.ground).multiplyScalar(.48),leaf=new THREE.Color(biome.high).lerp(new THREE.Color(palette.cloth),.28);
 function piece(source,tint,x,y,z,sx,sy,sz){const geometry=source.index?source.toNonIndexed():source.clone();source.dispose();dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,0,0);dummy.updateMatrix();geometry.applyMatrix4(dummy.matrix);const color=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<color.length;i+=3)color.set([tint.r,tint.g,tint.b],i);geometry.setAttribute('color',new THREE.BufferAttribute(color,3));geometry.deleteAttribute('uv');parts.push(geometry);}
 const box=(color,x,y,z,w,h,d)=>piece(new THREE.BoxGeometry(1,1,1),color,x,y,z,w,h,d);
 // The bench faces the street. Raised slats make its silhouette and shadows
 // visible in a player's normal camera, rather than microscopic decoration.
 for(const leg of [-.82,.82])box(stone,leg,.32,-.12,.24,.64,.70);
 for(let slat=0;slat<3;slat++)box(wood,0,.68,-.34+slat*.23,2.35,.14,.19);
 for(const leg of [-.92,.92])box(metal,leg,1.04,.25,.10,.82,.10);
 for(let slat=0;slat<2;slat++)box(wood,0,.96+slat*.25,.27,2.35,.18,.13);
 // Stone planter with an open soil inset and a botanical crown.
 box(stone,0,.31,1.38,1.8,.62,.76);box(wood,0,.64,1.38,1.50,.04,.56);
 for(const side of [-1,1])box(stone,side*.84,.69,1.38,.13,.17,.84);
 for(const side of [-1,1])box(stone,0,.69,1.38+side*.37,1.8,.17,.12);
 // A small pollarded street tree grows from the existing soil inset. Its
 // opaque crowns, trunk and branches replace the old three spherical shrubs,
 // stay within the same collision envelope and share the existing one draw.
 piece(new THREE.CylinderGeometry(1,1,1,6),wood,0,1.68,1.38,.12,2.08,.12);
 for(const side of [-1,1]){
  box(wood,side*.42,2.35,1.38,.95,.10,.10);
  piece(new THREE.CylinderGeometry(1,1,1,5),wood,side*.68,2.61,1.38,.055,.60,.055);
 }
 for(let crown=0;crown<9;crown++){
  const x=((crown%3)-1)*.65,y=2.75+Math.floor(crown/3)*.43,z=1.32+Math.sin(crown*2.4)*.25,tint=leaf.clone().multiplyScalar(.86+(crown%3)*.11);
  piece(new THREE.IcosahedronGeometry(1,0),tint,x,y,z,.57,.52,.48);
 }
 // A few warm blossoms sit above the rim, without transparent leaf cards.
 for(const x of [-.60,.60])piece(new THREE.IcosahedronGeometry(1,0),new THREE.Color(palette.sun),x,.87,1.22,.13,.13,.13);
 // A single lantern catches reflected light; it is deliberately not a GPU
 // point light. Its stepped cap changes with the architectural region.
 piece(new THREE.CylinderGeometry(1,1,1,8),metal,1.67,2.05,.42,.075,4.1,.075);
 box(stone,1.67,.16,.42,.42,.32,.42);box(stone,1.67,3.82,.42,.42,.10,.42);
 const glass=new THREE.Color(palette.sun).lerp(stone,.25);box(glass,1.67,4.02,.42,.28,.35,.28);
 for(const side of [-1,1])box(metal,1.67+side*.17,4.02,.42,.04,.40,.36);
 if(['algerie','maroc','tunisie','turquie'].includes(region))piece(new THREE.ConeGeometry(1,1,4),metal,1.67,4.29,.42,.35,.18,.35);
 else box(metal,1.67,4.24,.42,.47,.12,.47);
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData={villageFurniture:true,region};return geometry;
}
