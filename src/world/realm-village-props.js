import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {worldRealmArt} from '../design-system/tokens.js';

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
 for(let plant=0;plant<3;plant++)piece(new THREE.IcosahedronGeometry(1,1),leaf,(plant-1)*.48,1.02,1.38,.45,.47,.42);
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
